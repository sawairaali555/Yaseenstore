"use client";
import {useState} from 'react';
import {LogOut} from 'lucide-react';
import {toast} from 'sonner';
export default function Logout(){const [busy,setBusy]=useState(false);return <button className="admin-visit" style={{color:'inherit'}} disabled={busy} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/access/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!r.ok)throw Error('Unable to sign out. Try again.');location.assign('/admin/login')}catch(e){toast.error((e as Error).message);setBusy(false)}}}><LogOut size={16}/>{busy?'Signing out…':'Log out of admin'}</button>}
