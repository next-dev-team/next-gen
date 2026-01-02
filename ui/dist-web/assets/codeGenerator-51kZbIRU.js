import"./index-DqN4Ab-6.js";import"./x-CBMUblKp.js";import"./dialog-CXJV4Jkg.js";const J=o=>o.split(/[-_]/).map(r=>r.charAt(0).toUpperCase()+r.slice(1)).join(""),l=(o,r)=>{const n="  ".repeat(r);return o.split(`
`).map(t=>t.trim()?n+t:"").join(`
`)},j=(o,r=["children"])=>{const n=Object.entries(o).filter(([t,i])=>!r.includes(t)&&i!==void 0&&i!=="");return n.length===0?"":n.map(([t,i])=>typeof i=="boolean"?i?t:`${t}={false}`:typeof i=="number"?`${t}={${i}}`:typeof i=="object"?`${t}={${JSON.stringify(i)}}`:i.includes('"')||i.includes(`
`)?`${t}={\`${i}\`}`:`${t}="${i}"`).join(" ")},H=o=>!o||Object.keys(o).length===0?"":`style={${JSON.stringify(o)}}`,h=(o,r=0)=>{const{type:n,props:t={},style:i,children:d}=o;let s=J(n),a={...t},c=t.className||"";if(n==="section-container"){s="section";const e=t.padding?`py-${t.padding}`:"py-16",f=t.background==="muted"?"bg-muted/30":t.background==="gradient"?"bg-gradient-to-b from-background to-muted/30":t.background==="primary"?"bg-primary/5":"",g=t.maxWidth||"6xl",p=t.layout||"vertical",m=t.align||"center",b={vertical:"flex flex-col",horizontal:"flex flex-row flex-wrap","grid-2":"grid grid-cols-1 md:grid-cols-2","grid-3":"grid grid-cols-1 md:grid-cols-3"},y={left:"items-start text-left",center:"items-center text-center",right:"items-end text-right"};c=`w-full px-6 ${e} ${f} ${c}`.trim();const _=`mx-auto max-w-${g} ${b[p]} ${y[m]} gap-4`,{padding:$,background:T,maxWidth:S,layout:w,align:F,...B}=a,N=j(B,["className","children"]),P=d&&d.length>0?d.map(G=>h(G,r+2)).join(`
`):"";return l(`<section className="${c}"${N?" "+N:""}>
${l(`<div className="${_}">`,r+1)}
${P}
${l("</div>",r+1)}
</section>`,r)}if(n==="flex-row"){s="div";const e=t.gap||4,f=t.align||"center",g=t.justify||"start",p=t.wrap?"flex-wrap":"";c=`flex flex-row gap-${e} items-${f} justify-${g} ${p} ${c}`.trim();const{gap:m,align:b,justify:y,wrap:_,...$}=a;a=$}if(n==="flex-column"){s="div";const e=t.gap||4,f=t.align||"stretch";c=`flex flex-col gap-${e} items-${f} ${c}`.trim();const{gap:g,align:p,...m}=a;a=m}if(n==="card-root"&&(s="Card",delete a.width),n==="card-header"&&(s="CardHeader"),n==="card-content"&&(s="CardContent",(t.layout||"stack")==="grid"?c=`grid gap-4 ${c}`.trim():c=`flex flex-col space-y-2 ${c}`.trim(),delete a.layout),n==="card-footer"&&(s="CardFooter",c=`flex justify-${t.justify||"between"} ${c}`.trim(),delete a.justify),n==="card-title"&&(s="CardTitle",delete a.text),n==="card-description"&&(s="CardDescription",delete a.text),n==="card-container"){s="Card";const e=t.showHeader!==!1,f=t.showFooter===!0,g=d&&d.length>0?d.map(F=>h(F,r+2)).join(`
`):"";let p="";e&&(t.title||t.description)&&(p+=l(`<CardHeader>
  ${t.title?`<CardTitle>${t.title}</CardTitle>`:""}
  ${t.description?`<CardDescription>${t.description}</CardDescription>`:""}
</CardHeader>`,r+1)+`
`),p+=l(`<CardContent>
${g}
</CardContent>`,r+1),f&&(p+=`
`+l(`<CardFooter>
  <p>Card Footer</p>
</CardFooter>`,r+1));const{showHeader:m,showFooter:b,title:y,description:_,...$}=a,T=j($,["children"]),S=H(i),w=[T,S].filter(Boolean).join(" ");return l(`<Card${w?" "+w:""}>
${p}
</Card>`,r)}if(["heading","h1","h2","h3","h4","h5","h6"].includes(n)){const e=t.level||1;s=`h${e}`,c||(c={1:"text-4xl font-extrabold tracking-tight lg:text-5xl",2:"text-3xl font-semibold tracking-tight",3:"text-2xl font-semibold tracking-tight",4:"text-xl font-semibold tracking-tight"}[e]||""),delete a.level,delete a.text}n==="paragraph"&&(s="p",c||(c="leading-7 [&:not(:first-child)]:mt-6"),delete a.text),n==="button"&&(s="Button",delete a.text),c&&(a.className=c);const C=j(a,["children","className"]),x=H(i),u=[C,x].filter(Boolean).join(" ");if(n==="card-container"){const e=t.showHeader!==!1,f=t.showFooter===!0,g=d&&d.length>0?d.map(m=>h(m,r+2)).join(`
`):"";let p="";return e&&(t.title||t.description)&&(p+=l(`<CardHeader>
  ${t.title?`<CardTitle>${t.title}</CardTitle>`:""}
  ${t.description?`<CardDescription>${t.description}</CardDescription>`:""}
</CardHeader>`,r+1)+`
`),p+=l(`<CardContent>
${g}
</CardContent>`,r+1),f&&(p+=`
`+l(`<CardFooter>
  <p>Card Footer</p>
</CardFooter>`,r+1)),l(`<Card${u?" "+u:""}>
${p}
</Card>`,r)}if(d&&d.length>0){const e=d.map(f=>h(f,r+1)).join(`
`);return l(`<${s}${u?" "+u:""}>
${e}
</${s}>`,r)}if(t.text||t.children){const e=t.text||t.children;return l(`<${s}${u?" "+u:""}>${e}</${s}>`,r)}return l(`<${s}${u?" "+u:""} />`,r)},D=o=>{const r=new Set,n=t=>{t.forEach(i=>{r.add(i.type),i.children&&n(i.children)})};return n(o),Array.from(r)},I=o=>{const r=[],n=["Button","Input","Card","CardHeader","CardTitle","CardDescription","CardContent","CardFooter","Label","Badge","Separator","Switch","Tabs","TabsList","TabsTrigger","TabsContent"],t=o.map(J).filter(e=>n.includes(e)),i=t.filter(e=>e==="Button"),d=t.filter(e=>e==="Input"),s=t.filter(e=>["Card","CardHeader","CardTitle","CardDescription","CardContent","CardFooter"].includes(e)),a=t.filter(e=>e==="Label"),c=t.filter(e=>e==="Badge"),C=t.filter(e=>e==="Separator"),x=t.filter(e=>e==="Switch"),u=t.filter(e=>["Tabs","TabsList","TabsTrigger","TabsContent"].includes(e));return i.length&&r.push('import { Button } from "@/components/ui/button";'),d.length&&r.push('import { Input } from "@/components/ui/input";'),s.length&&r.push(`import { ${s.join(", ")} } from "@/components/ui/card";`),a.length&&r.push('import { Label } from "@/components/ui/label";'),c.length&&r.push('import { Badge } from "@/components/ui/badge";'),C.length&&r.push('import { Separator } from "@/components/ui/separator";'),x.length&&r.push('import { Switch } from "@/components/ui/switch";'),u.length&&r.push(`import { ${u.join(", ")} } from "@/components/ui/tabs";`),r.join(`
`)},O=(o,r={})=>{const{componentName:n="Page",includeImports:t=!0}=r;if(!o||o.length===0)return`export default function ${n}() {
  return (
    <div className="min-h-screen">
      {/* Add components here */}
    </div>
  );
}`;const i=D(o),d=t?I(i):"",s=o.map(a=>h(a,2)).join(`
`);return`${d?d+`

`:""}export default function ${n}() {
  return (
    <div className="min-h-screen">
${s}
    </div>
  );
}`},z=o=>o?h(o,0):"",W=async o=>{try{return await navigator.clipboard.writeText(o),!0}catch(r){return console.error("Failed to copy:",r),!1}};export{O as a,W as c,z as g};
