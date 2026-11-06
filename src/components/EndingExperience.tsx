import {useEffect,useRef,useState} from 'react';
import ZombiePortrait from './ZombiePortrait';
import {deriveCauseOfDeath,deriveDeathEndingPresentation,type CharacterBioDossier,type ZonePopulationState} from '../data/pastLifeEchoes';
import {endingMetrics,endingReflections,isStaticEndingText} from '../data/endingPresentation';
import {soundFx} from '../utils/soundFx';

export default function EndingExperience({state,ending,bio,zones,chronicle,onNewLife,onHub}:{state:any;ending:any;bio:CharacterBioDossier;zones:Record<string,ZonePopulationState>;chronicle:any;onNewLife:()=>void;onHub:()=>void}) {
  const scene=useRef<HTMLCanvasElement>(null),portrait=useRef<HTMLDivElement>(null);
  const [saveError,setSaveError]=useState('');
  const metrics=endingMetrics(state,zones);
  const derived=deriveDeathEndingPresentation(state,bio,ending,zones);
  const cause=derived.cause;
  const isGenericTitle = (t?: string) =>
    !t || t === 'ตายเป็นครั้งที่สอง' || t === 'ร่างนี้สิ้นแรงและหยุดเดิน' || t === 'บทจบของชีวิต';
  const isGenericText = (txt?: string) =>
    !txt || txt.includes('ครั้งแรกเจ้าเสียหัวใจ') || isStaticEndingText(ending?.id || state?.ending?.id, txt);
  const displayTitle = ending?.title && !isGenericTitle(ending.title) ? ending.title : derived.title;
  const displayText = ending?.text && !isGenericText(ending.text) ? ending.text : derived.text;
  const effectiveMutation = state?.ending?.id === 'human' ? 0 : Number(state?.stats?.mutation || 0);
  const stats=[['วันที่มาถึง',metrics.days,'วัน'],['ช่วยชีวิต',metrics.saved,'ครั้ง'],['สังหารมนุษย์',metrics.killed,'คน'],['พันธมิตร',metrics.allies,'คน']];
  useEffect(()=>{
    window.scrollTo(0,0);
    const renderer=(window as any).AfterZeroEngine?.Scene;
    if(scene.current&&renderer)renderer.draw(scene.current,state,state.day||1,{hideCharacter:true});
    if(state?.ending?.id==='human'){
      soundFx.playHeartbeatPulse();
    }
  },[state.runId,state.ending?.id]);
  async function saveCard(){
    try {
      await document.fonts.ready;
      const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1100;
      const ctx=canvas.getContext('2d')!;
      ctx.fillStyle='#101916';ctx.fillRect(0,0,900,1100);
      if(scene.current){ctx.imageSmoothingEnabled=false;ctx.drawImage(scene.current,30,30,840,370);}
      const svg=portrait.current?.querySelector('svg');
      if(svg){const clone=svg.cloneNode(true) as SVGElement;clone.setAttribute('xmlns','http://www.w3.org/2000/svg');const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
        try{const img=new Image();img.src=url;await img.decode();ctx.drawImage(img,330,140,240,240);}finally{URL.revokeObjectURL(url);}}
      ctx.strokeStyle='#c8ac70';ctx.lineWidth=3;ctx.strokeRect(20,20,860,1060);
      ctx.textAlign='center';ctx.fillStyle='#d7bd83';ctx.font='24px sans-serif';ctx.fillText('AFTER ZERO · หนึ่งชีวิตที่โลกจดจำ',450,450);
      let y=515;ctx.fillStyle='#fff4d7';ctx.font='bold 34px sans-serif';
      const wrap=(text:string,max:number)=>{let line='';for(const char of text){if(ctx.measureText(line+char).width>max){ctx.fillText(line,450,y);y+=48;line='';}line+=char;}if(line){ctx.fillText(line,450,y);y+=48;}};
      wrap(displayTitle,760);ctx.font='26px sans-serif';wrap(`${bio.occupation} · อายุ ${bio.age} ปี · ${bio.gender}`,760);
      y+=30;ctx.font='28px sans-serif';for(const [label,value,unit] of stats){ctx.fillText(`${label}   ${value} ${unit}`,450,y);y+=65;}
      ctx.fillStyle='#b7c1b7';ctx.font='22px sans-serif';y+=20;wrap('ชีวิตนี้มีความหมายมากกว่าตัวเลขเพียงค่าเดียว',750);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG')),'image/png'));
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`after-zero-${state.runId}.png`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setSaveError('');
    }catch{setSaveError('บันทึกภาพไม่สำเร็จ กรุณาลองอีกครั้ง');}
  }
  return <main className="ending-experience" data-resolution={cause.code} data-ending-id={state.ending.id}>
    <section className="ending-moment" aria-labelledby="ending-title">
      <canvas ref={scene} width={320} height={144} className="ending-landscape" aria-hidden="true"/>
      <div className="ending-shade"/>
      <div className="ending-moment-content">
        <p className="ending-eyebrow">AFTER ZERO · บทสุดท้ายของชีวิตนี้</p>
        <div className="ending-portrait" ref={portrait}><ZombiePortrait bio={bio} mutation={effectiveMutation}/></div>
        <h1 id="ending-title">{displayTitle}</h1>
        <p className="ending-prose">{displayText}</p>
        <a className="ending-scroll" href="#ending-world">ดูสิ่งที่เจ้าทิ้งไว้ ↓</a>
      </div>
    </section>
    <section className="ending-world" id="ending-world">
      <p className="ending-eyebrow">ร่องรอยจากการเลือกของเจ้า</p>
      <h2>โลกที่เจ้าเปลี่ยนไว้</h2>
      <ul>{endingReflections(state, zones).map(line=><li key={line}>{line}</li>)}</ul>
      <details><summary>อ่านบันทึกช่วงสุดท้าย</summary><p>{cause.title}</p><p>{cause.description}</p>
        {chronicle?.milestones?.map((m:any,i:number)=><p key={m.id||i}>{m.day?`วันที่ ${m.day} · `:''}{m.text}</p>)}</details>
      <a className="ending-scroll" href="#ending-card">เก็บชีวิตนี้ไว้ ↓</a>
    </section>
    <section className="ending-keepsake" id="ending-card">
      <p className="ending-eyebrow">หนึ่งชีวิตที่โลกจดจำ</p>
      <article className="ending-life-card">
        <p className="ending-eyebrow">AFTER ZERO · LIFE RECORD</p>
        <div className="ending-card-portrait"><ZombiePortrait bio={bio} mutation={effectiveMutation}/></div>
        <h2>{displayTitle}</h2><p>{bio.occupation} · อายุ ${bio.age} ปี · ${bio.gender}</p>
        <p className="ending-place">{zones[state.place]?.placeName||state.place}</p>
        <dl>{stats.map(([label,value,unit])=><div key={label}><dt>{label}</dt><dd>{value}<small>{unit}</small></dd></div>)}</dl>
        <p className="ending-card-footnote">พันธมิตร: คนเป็นที่ยังมีชีวิตและไว้ใจเจ้าอย่างน้อย 85/100<br/>จำนวนครั้งที่ช่วยชีวิตอาจรวมการช่วยคนเดิม</p>
        <p className="ending-final-line">ชีวิตนี้มีความหมายมากกว่าตัวเลขเพียงค่าเดียว</p>
      </article>
      <div className="ending-controls"><button onClick={saveCard}>บันทึกการ์ดเป็นภาพ</button><button className="ending-primary" onClick={onNewLife}>ตื่นขึ้นในชีวิตใหม่</button><button onClick={onHub}>กลับหน้าเลือกเซฟ</button></div>
      {saveError&&<p role="alert">{saveError}</p>}
    </section>
  </main>;
}
