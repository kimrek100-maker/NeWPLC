declare global { interface Window { studio?: { token: string } } }
export async function api(path:string, init:RequestInit={}):Promise<any> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type','application/json');
  if(window.studio?.token) headers.set('X-Studio-Token',window.studio.token);
  const r=await fetch('http://127.0.0.1:8765/api'+path,{...init,headers});
  if (!r.ok) {
    const body = await r.text();
    let message = body.trim() || r.statusText || `HTTP ${r.status}`;
    if (r.headers.get('content-type')?.includes('json') && body) {
      try {
        const detail = JSON.parse(body)?.detail;
        if (detail != null) message = typeof detail === 'string' ? detail : JSON.stringify(detail);
      } catch { /* Keep the original response text. */ }
    }
    throw new Error(message);
  }
  return path.startsWith('/export')?r.blob():r.json();
}
export const post=(path:string, body:unknown)=>api(path,{method:'POST',body:JSON.stringify(body)});
