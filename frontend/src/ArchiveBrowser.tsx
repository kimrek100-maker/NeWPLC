import {useEffect, useRef, useState} from 'react';
import Editor from '@monaco-editor/react';
import {Archive, Download, X} from 'lucide-react';
import type {Layout} from './synoptic/types';
import {api, post} from './api';

export type SavedProject = {id:string; name:string; family:string; code:string; updated?:string;synoptic?:Layout|null};
type Revision = {id:number; code:string; family:string; note:string; created:string;synoptic?:Layout|null};
type Entry = Omit<SavedProject,'code'> & {revision_count:number};
type Detail = {project:SavedProject; revisions:Revision[]};
const date = (value?:string) => value ? new Date(value).toLocaleString('it-IT') : '';

export function ArchiveBrowser({onClose, onOpen, onCopy}: {
  onClose:()=>void;
  onOpen:(project:SavedProject)=>void;
  onCopy:(project:SavedProject)=>void;
}) {
  const dialog=useRef<HTMLDivElement>(null);
  const previousFocus=useRef(document.activeElement as HTMLElement|null);
  useEffect(()=>()=>previousFocus.current?.focus(),[]);
  const [query,setQuery]=useState(''), [family,setFamily]=useState('');
  const [offset,setOffset]=useState(0), [total,setTotal]=useState(0);
  const [items,setItems]=useState<Entry[]>([]), [detail,setDetail]=useState<Detail|null>(null);
  const [selected,setSelected]=useState<number|null>(null), [selectedId,setSelectedId]=useState('');
  const [error,setError]=useState(''), [loading,setLoading]=useState(true), [reading,setReading]=useState(false);
  const [exporting,setExporting]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setReading(false);setError('');setDetail(null);setSelectedId('');setItems([]);setTotal(0);
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({q:query,offset:String(offset),limit:'25'});
      if(family)params.set('family',family);
      api('/archive/projects?'+params,{signal:controller.signal})
        .then(data=>{setItems(data.items);setTotal(data.total)})
        .catch(e=>{if(e.name!=='AbortError')setError(e.message)})
        .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    },200);
    return ()=>{clearTimeout(timer);controller.abort()};
  },[query,family,offset]);
  useEffect(()=>{
    if(!selectedId)return;
    const controller=new AbortController();
    setReading(true);setDetail(null);setSelected(null);setError('');
    api('/archive/projects/'+encodeURIComponent(selectedId),{signal:controller.signal})
      .then(data=>setDetail(data))
      .catch(e=>{if(e.name!=='AbortError')setError(e.message)})
      .finally(()=>{if(!controller.signal.aborted)setReading(false)});
    return ()=>controller.abort();
  },[selectedId]);
  const revision=detail?.revisions.find(r=>r.id===selected);
  const preview=detail && { ...detail.project, code:revision?.code??detail.project.code, family:revision?.family??detail.project.family, synoptic:revision?revision.synoptic:detail.project.synoptic };
  async function download(){
    if(!preview)return;
    setExporting(true);setError('');
    try {
      const blob=await post('/export/st',preview);
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download='Main.st';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e){setError((e as Error).message)} finally {setExporting(false)}
  }
  return <div ref={dialog} className="archive-overlay" role="dialog" aria-modal="true" aria-labelledby="archive-title" onKeyDown={e=>{
    if(e.key==='Escape'){e.stopPropagation();onClose()}
    if(e.key==='Tab'){
      const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]')??[]).filter(node=>node.getClientRects().length);
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
    }
  }}>
    <div className="archive-header"><h2 id="archive-title"><Archive size={20}/> Archivio progetti</h2><span>Salvataggi locali e revisioni · consultazione in sola lettura</span><button autoFocus onClick={onClose} aria-label="Chiudi archivio"><X size={20}/></button></div>
    <div className="archive-filters"><label>Cerca in nome, codice e note delle revisioni<input value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setOffset(0)}} placeholder="Es. MotorRun o comando pompa"/></label><label>Famiglia PLC attuale<select value={family} onChange={e=>{setFamily(e.target.value);setOffset(0)}}><option value="">Tutte le famiglie</option>{['M241','M251','M262','M340','M580'].map(f=><option key={f}>{f}</option>)}</select></label></div>
    {error&&<p className="archive-error" role="alert">{error}</p>}
    <div className="archive-content"><section className="archive-list" aria-label="Progetti archiviati">
      <p role="status">{loading?'Ricerca in corso…':`${total} progetti salvati`}</p>
      {!loading&&!error&&!items.length&&<p className="hint">Nessun progetto trovato. I progetti compaiono qui dopo il salvataggio nell’editor.</p>}
      {!loading&&items.map(p=><button key={p.id} className={'archive-entry '+(selectedId===p.id?'chosen':'')} aria-pressed={selectedId===p.id} onClick={()=>setSelectedId(p.id)}><strong>{p.name}</strong><span>{p.family} · {p.revision_count} revisioni</span><small>Ultimo salvataggio: {date(p.updated)}</small></button>)}
      <div className="archive-pagination"><button disabled={loading||offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>Precedenti</button><span>{total?`${offset+1}–${Math.min(offset+25,total)}`:'0'}</span><button disabled={loading||offset+25>=total} onClick={()=>setOffset(offset+25)}>Successivi</button></div>
    </section><section className="archive-preview" aria-label="Anteprima progetto">
      {reading?<p>Caricamento delle revisioni…</p>:detail&&preview?<>
        <div className="archive-preview-header"><h3>{detail.project.name}</h3><label>Versione da consultare<select value={selected??''} onChange={e=>setSelected(e.target.value?Number(e.target.value):null)}><option value="">Ultimo salvataggio · {detail.project.family}</option>{detail.revisions.map(r=><option key={r.id} value={r.id}>Revisione {r.id} · {date(r.created)} · {r.family} · {r.note}</option>)}</select></label><small>{preview.family} · Sorgente salvato, validazione non attestata · {preview.synoptic?.nodes.length??0} elementi sinottico nella versione</small></div>
        <div className="archive-editor"><Editor language="structured-text" theme="studio" value={preview.code} options={{readOnly:true,domReadOnly:true,fontSize:13,minimap:{enabled:false},automaticLayout:true,scrollBeyondLastLine:false,wordWrap:'on'}}/></div>
        <div className="archive-actions"><button className="secondary" disabled={exporting} onClick={download}><Download size={15}/> Esporta questa versione ST</button><button className="secondary" onClick={()=>onCopy(preview)}>Crea bozza da questa versione</button><button className="primary" onClick={()=>onOpen(detail.project)}>Apri progetto attuale</button></div>
      </>:<div className="archive-empty"><Archive size={35}/><h3>Consulta i progetti precedenti</h3><p>Seleziona un progetto per leggere il codice e la cronologia. La consultazione non modifica i salvataggi.</p></div>}
    </section></div>
  </div>;
}
