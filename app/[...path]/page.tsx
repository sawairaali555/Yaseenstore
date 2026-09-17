import Store from "../store";
import {catalog,categoryTree,settings} from "@/lib/store-data";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{path:string[]}>}){const {path}=await params;try{const [items,config,tree]=await Promise.all([catalog(),settings(),categoryTree()]);return <Store path={path} initialProducts={items} config={config} categories={tree}/>;}catch{return <main className="wrap section"><h1>We’ll be right back</h1><p>The store is temporarily unavailable. Please refresh in a moment.</p></main>;}}
