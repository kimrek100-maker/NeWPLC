export function ProjectViewTabs({value,onChange}:{value:'code'|'synoptic';onChange:(value:'code'|'synoptic')=>void}) {
  const tabs=[{id:'code' as const,label:'Codice ST'},{id:'synoptic' as const,label:'Sinottico impianto'}];
  return <div className="workspace-view-tabs" role="tablist" aria-label="Vista progetto">{tabs.map((tab,index)=><button key={tab.id} id={'view-tab-'+tab.id} role="tab" aria-controls="workspace-view-panel" aria-selected={value===tab.id} tabIndex={value===tab.id?0:-1} onClick={()=>onChange(tab.id)} onKeyDown={e=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    onChange(tabs[next].id);(e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
  }}>{tab.label}</button>)}</div>;
}
