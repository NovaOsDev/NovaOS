const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const boot=$("#boot"),setup=$("#setup"),lock=$("#lock"),desktop=$("#desktop");
let z=100, profile=null;

const NOVA_OWNER_BUILD=false;
const NOVA_DEVICE_NAME="Samuel";
function applyRole(){
  const isOwner=NOVA_OWNER_BUILD;
  $$(".ownerOnly").forEach(x=>x.classList.toggle("hidden",!isOwner));
  const rt=$("#roleText"),rp=$("#rolePill");
  if(rt)rt.textContent=isOwner?"NOVA OWNER PC · Samuel":"Standard Nova PC";
  if(rp){rp.textContent=isOwner?"OWNER":"USER";rp.style.color=isOwner?"var(--cyan)":"";}
  return isOwner;
}
const saved=()=>{try{return JSON.parse(localStorage.getItem("novaProfile"))}catch{return null}};
const save=p=>localStorage.setItem("novaProfile",JSON.stringify(p));

setTimeout(()=>{boot.classList.add("hidden");profile=saved(); if(profile) showLock(); else setup.classList.remove("hidden")},1700);

function showLock(){setup.classList.add("hidden");desktop.classList.add("hidden");lock.classList.remove("hidden");profile=saved()||profile;$("#loginName").textContent=profile?.name||"Nova User";$("#loginPass").value="";$("#loginMsg").textContent="";setTimeout(()=>$("#loginPass").focus(),50)}
function showDesktop(){lock.classList.add("hidden");desktop.classList.remove("hidden");$("#startName").textContent=profile.name;$("#profileText").textContent=profile.name+" · Lokales Simulator-Profil";applyRole();toast("Willkommen zurück, "+profile.name+".")}
$("#setupNext").onclick=()=>{let n=$("#setupName").value.trim(),p=$("#setupPass").value,p2=$("#setupPass2").value;if(!n)return $("#setupMsg").textContent="Bitte gib einen Namen ein.";if(p.length<4)return $("#setupMsg").textContent="Nimm mindestens 4 Zeichen.";if(p!==p2)return $("#setupMsg").textContent="Die Passwörter stimmen nicht überein.";profile={name:n,password:p};save(profile);setup.classList.add("hidden");showDesktop()};
function login(){profile=saved();if(!profile)return showLock();if($("#loginPass").value===profile.password)showDesktop();else $("#loginMsg").textContent="Falsches Passwort."}
$("#loginBtn").onclick=login;$("#loginPass").addEventListener("keydown",e=>e.key==="Enter"&&login());

function openApp(id){if(id==="owner"&&!applyRole()){toast("Owner-Berechtigung erforderlich.");return;}let w=$("#"+id);w.classList.remove("hidden");w.style.zIndex=++z;$("#start").classList.add("hidden");addTask(id);if(id==="terminal")setTimeout(()=>$("#termIn").focus(),30)}
function addTask(id){if(document.querySelector(`[data-task="${id}"]`))return;let b=document.createElement("button");b.className="taskapp";b.dataset.task=id;b.textContent={browser:"◎ Browser",files:"▰ Dateien",settings:"⚙ Einstellungen",terminal:">_ Terminal",owner:"◆ Owner"}[id];b.onclick=()=>{let w=$("#"+id);w.classList.toggle("hidden");if(!w.classList.contains("hidden"))w.style.zIndex=++z};$("#running").appendChild(b)}
function removeTask(id){document.querySelector(`[data-task="${id}"]`)?.remove()}
$$("[data-open]").forEach(b=>b.ondblclick=()=>openApp(b.dataset.open));
$$("#start [data-open]").forEach(b=>b.onclick=()=>openApp(b.dataset.open));

$$(".window").forEach(w=>{let drag=false,ox=0,oy=0,restore=null;w.onmousedown=()=>w.style.zIndex=++z;let bar=w.querySelector(".titlebar");bar.addEventListener("mousedown",e=>{if(e.target.tagName==="BUTTON")return;drag=true;ox=e.clientX-w.offsetLeft;oy=e.clientY-w.offsetTop});document.addEventListener("mousemove",e=>{if(!drag)return;w.style.left=Math.max(0,Math.min(innerWidth-w.offsetWidth,e.clientX-ox))+"px";w.style.top=Math.max(2,Math.min(innerHeight-50-w.offsetHeight,e.clientY-oy))+"px"});document.addEventListener("mouseup",()=>drag=false);
 w.querySelector("[data-close]").onclick=()=>{w.classList.add("hidden");removeTask(w.id)};
 w.querySelector("[data-min]").onclick=()=>w.classList.add("hidden");
 w.querySelector("[data-max]").onclick=()=>{if(!w.dataset.max){restore={left:w.style.left,top:w.style.top,width:w.style.width,height:w.style.height};Object.assign(w.style,{left:"0",top:"2px",width:"100%",height:"calc(100% - 52px)"});w.dataset.max=1}else{Object.assign(w.style,restore);delete w.dataset.max}}});

$("#startBtn").onclick=e=>{$("#start").classList.toggle("hidden");$("#quick").classList.add("hidden");e.stopPropagation()};
$("#quickBtn").onclick=e=>{$("#quick").classList.toggle("hidden");$("#start").classList.add("hidden");e.stopPropagation()};
desktop.addEventListener("mousedown",e=>{if(!e.target.closest("#start")&&!e.target.closest("#startBtn"))$("#start").classList.add("hidden");if(!e.target.closest("#quick")&&!e.target.closest("#quickBtn"))$("#quick").classList.add("hidden")});
$("#power").onclick=showLock;$("#lockNow").onclick=showLock;
$("#resetProfile").onclick=()=>{if(confirm("Nova-Profil wirklich zurücksetzen?")){localStorage.removeItem("novaProfile");location.reload()}};
$("#gridToggle").onclick=()=>desktop.classList.toggle("no-grid");

const web=$("#web"),url=$("#url");function norm(v){v=v.trim();if(!v)return"https://www.wikipedia.org";if(/^https?:\/\//i.test(v))return v;if(v.includes(".")&&!v.includes(" "))return"https://"+v;return"https://www.google.com/search?q="+encodeURIComponent(v)}
function go(){web.src=norm(url.value)}$("#go").onclick=go;url.onkeydown=e=>e.key==="Enter"&&go();$("#back").onclick=()=>web.canGoBack()&&web.goBack();$("#forward").onclick=()=>web.canGoForward()&&web.goForward();$("#reload").onclick=()=>web.reload();web.addEventListener("did-navigate",e=>url.value=e.url);web.addEventListener("did-navigate-in-page",e=>url.value=e.url);

$("#termIn").addEventListener("keydown",e=>{if(e.key!=="Enter")return;let v=e.target.value.trim(),out=$("#termOut");out.innerHTML+=`nova&gt; ${escapeHtml(v)}<br>`;let a=v.toLowerCase();if(a==="help")out.innerHTML+="help, clear, version, whoami, date, echo [text], open browser/files/settings<br>";else if(a==="clear")out.innerHTML="";else if(a==="version")out.innerHTML+="Nova Simulator 0.5<br>";else if(a==="whoami")out.innerHTML+=escapeHtml(profile?.name||"unknown")+"<br>";else if(a==="date")out.innerHTML+=new Date().toLocaleString("de-DE")+"<br>";else if(a.startsWith("echo "))out.innerHTML+=escapeHtml(v.slice(5))+"<br>";else if(a.startsWith("open ")){let id=a.slice(5);if(["browser","files","settings"].includes(id))openApp(id);else out.innerHTML+="App nicht gefunden.<br>"}else if(a)out.innerHTML+="Unbekannter Befehl. Tippe help.<br>";e.target.value="";out.parentElement.scrollTop=out.parentElement.scrollHeight});
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(t){let x=$("#toast");x.querySelector("span").textContent=t;x.classList.remove("hidden");clearTimeout(window.toastT);window.toastT=setTimeout(()=>x.classList.add("hidden"),2800)}
function tick(){let d=new Date();$("#clock").textContent=d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});$("#date").textContent=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});$("#lockClock").textContent=d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});$("#lockDate").textContent=d.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})}tick();setInterval(tick,1000);

$("#devMode")?.addEventListener("click",()=>{
  if(!applyRole())return;
  const b=$("#devMode"),on=b.dataset.on!=="1";b.dataset.on=on?"1":"0";b.querySelector("span").textContent=on?"ON":"OFF";
  $("#ownerLog").innerHTML+=`Developer Mode ${on?"enabled":"disabled"}<br>`;
});
$("#systemInfo")?.addEventListener("click",()=>{
  if(!applyRole())return;
  $("#ownerLog").innerHTML+=`Build: Nova Simulator 0.5.0 | Runtime: Electron | Role: OWNER PC<br>`;
});
$("#ownerLock")?.addEventListener("click",()=>{if(applyRole())showLock()});
$("#ownerToast")?.addEventListener("click",()=>{if(applyRole())toast("Owner Service: Test erfolgreich.")});
