const sampleFindings = [
  {id:"e1",type:"evidence",name:"Evidence",severity:"CHECK THIS",title:"A result from three hospitals becomes a broad promise",body:"The cited trial measured intake time in three urban networks. That does not establish system-wide efficiency or better care.",source:"Page 03",page:3,quote:"these systems can return meaningful time to clinical teams",question:"What evidence connects the time saved to a better outcome?"},
  {id:"o1",type:"omissions",name:"Blind spot",severity:"CONTEXT",title:"The rollout conditions disappear from the conclusion",body:"Dedicated implementation teams and complete records shaped the pilots. Smaller clinics may face very different conditions.",source:"Page 03",page:3,quote:"The same approach may look different in settings where data is less complete",question:"How might the result change in a smaller clinic?"},
  {id:"f1",type:"framing",name:"Framing",severity:"LANGUAGE",title:"“Near-term transformation” is stronger than the evidence",body:"The phrase creates a sense of inevitability. The examples that follow are small, early-stage pilots.",source:"Page 03",page:3,quote:"a near-term transformation in how care is delivered",question:"What evidence supports the word “transformation”?"},
  {id:"e2",type:"evidence",name:"Evidence",severity:"OPEN QUESTION",title:"Time saved is not yet tied to patient outcomes",body:"The brief moves from a faster intake process to better care without a measured link between the two.",source:"Page 03",page:3,quote:"The available evaluations have not yet shown whether time saved translates into better patient outcomes.",question:"Is there an outcome study that tests this link?"},
  {id:"o2",type:"omissions",name:"Blind spot",severity:"FOLLOW-UP",title:"Longer-term outcomes remain unclear",body:"The brief notes that few evaluations follow outcomes past year one. That limits what we can say about sustained effects.",source:"Page 03",page:3,quote:"Few published evaluations follow outcomes beyond the first year.",question:"What is known about effects after the first year?"},
  {id:"e3",type:"evidence",name:"Evidence",severity:"SCOPE",title:"The cited evaluation is small in scope",body:"Three hospital networks offer an early signal. The brief should keep that narrow scope visible when it describes what the tools can do.",source:"Page 03",page:3,quote:"across three hospital networks",question:"How representative were these three networks?"},
  {id:"f2",type:"framing",name:"Framing",severity:"TONE",title:"“Encouraging” asks the reader to judge before seeing the result",body:"This evaluative phrase leads with a conclusion. Let the measured result speak first, then explain what it means.",source:"Page 03",page:3,quote:"Early results appear encouraging.",question:"Could you state the measured result before interpreting it?"}
];
let findings=[...sampleFindings], activeFilter="all", selectedId="e1", explored=new Set(), resolved=new Set(), page=3, liveDoc=null, largeText=false, oldest=false, toastTimer;
const $=selector=>document.querySelector(selector);
const sourceLinks=(()=>{try{return JSON.parse(localStorage.getItem("lucent-source-links")||"{}")}catch{return {}}})();
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const toast=message=>{const element=$("#toast");element.textContent=message;element.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove("show"),2600)};

function render(){
  const visible=findings.filter(item=>activeFilter==="all"||item.type===activeFilter);
  $("#findingCount").textContent=visible.length;
  $("#findingsList").innerHTML=(oldest?[...visible].reverse():visible).map(item=>`<article class="finding ${selectedId===item.id?"selected":""} ${resolved.has(item.id)?"resolved":""}" data-id="${escapeHTML(item.id)}"><div class="finding-top"><i class="category-dot ${item.type}"></i><span class="category-name">${escapeHTML(item.name)}</span><span class="severity">${resolved.has(item.id)?"SAVED":escapeHTML(item.severity)}</span></div><h3><button class="finding-title" data-action="open">${escapeHTML(item.title)}</button></h3><p>${escapeHTML(item.body)}</p><div class="finding-source"><span>${escapeHTML(item.source)}</span><button class="passage-button" data-action="open">View passage ↗</button></div><div class="finding-actions"><button data-action="keep">Keep in review</button><button data-action="resolve">Mark explored</button></div></article>`).join("");
  document.querySelectorAll(".finding").forEach(card=>card.addEventListener("click",event=>{const action=event.target.closest("[data-action]")?.dataset.action;if(!action)return;event.stopPropagation();if(action==="open"){selectFinding(card.dataset.id);return}explored.add(card.dataset.id);if(action==="resolve")resolved.add(card.dataset.id);updateProgress();render();toast(action==="resolve"?"Observation marked as explored":"Observation kept in your review")}));
  document.querySelectorAll(".lens").forEach(button=>{button.classList.toggle("active",button.dataset.filter===activeFilter);const count=button.querySelector("b");if(count)count.textContent=button.dataset.filter==="all"?findings.length:findings.filter(item=>item.type===button.dataset.filter).length});
  if(liveDoc)renderDocument();
  else document.querySelectorAll(".hl").forEach(mark=>mark.classList.toggle("selected",mark.dataset.id===selectedId));
  const index=findings.findIndex(item=>item.id===selectedId);$("#findingPosition").textContent=index<0?"No finding selected":`Finding ${index+1} of ${findings.length}`;
  renderTrail();
}

function renderDocument(){
  const total=liveDoc.pages.length;page=Math.max(1,Math.min(page,total));const current=liveDoc.pages[page-1];
  $("#pageNum").textContent=String(current.number).padStart(2,"0");$(".page-control small").textContent=`/ ${String(liveDoc.pages[total-1].number).padStart(2,"0")}`;
  $("#documentName").textContent=liveDoc.filename;$("#documentMeta").textContent=`${liveDoc.pages.length} extracted ${liveDoc.pages.length===1?"page":"pages"} · ${liveDoc.model}`;
  $("#paper").innerHTML=`<div class="paper-kicker">${escapeHTML(liveDoc.filename)} <span>·</span> PAGE ${String(current.number).padStart(2,"0")}</div><div class="uploaded-text">${highlightText(current.text,current.number)}</div><div class="paper-footer"><span>PRIVATE DOCUMENT REVIEW</span><span>${String(current.number).padStart(2,"0")}</span></div>`;
  $("#introDeck").textContent=liveDoc.summary+(liveDoc.truncated?" Some text beyond the review limit was not included.":"");
  $(".page-control").classList.toggle("single-page",total===1);
  document.querySelectorAll(".hl").forEach(mark=>mark.classList.toggle("selected",mark.dataset.id===selectedId));
}

function highlightText(text,pageNumber){
  const candidates=findings.filter(item=>item.page===pageNumber&&item.quote).map(item=>({item,start:text.indexOf(item.quote)})).filter(hit=>hit.start>=0).sort((a,b)=>a.start-b.start);
  const matches=[];let end=0;for(const hit of candidates){if(hit.start<end)continue;matches.push({...hit,end:hit.start+hit.item.quote.length});end=hit.start+hit.item.quote.length}
  let result="",cursor=0;for(const match of matches){result+=escapeHTML(text.slice(cursor,match.start))+`<mark class="hl ${match.item.type}" data-id="${escapeHTML(match.item.id)}" tabindex="0" role="button" aria-label="Open finding: ${escapeHTML(match.item.title)}">${escapeHTML(text.slice(match.start,match.end))}</mark>`;cursor=match.end}result+=escapeHTML(text.slice(cursor));
  return result.split(/\n{2,}/).map(paragraph=>`<p>${paragraph.replace(/\n/g,"<br>")}</p>`).join("");
}

function renderTrail(){
  const item=findings.find(candidate=>candidate.id===selectedId);if(!item){$("#evidenceTrail").innerHTML="";return}const href=sourceLinks[item.id];
  $("#evidenceTrail").innerHTML=`<div class="trail-head"><span class="trail-mark">⌁</span><div><small>TRACE THIS FINDING</small><h3>What is said. What is inferred.</h3></div></div><div class="trail-step"><small>IN THE DOCUMENT <span>${escapeHTML(item.source)}</span></small><blockquote>“${escapeHTML(item.quote||item.title)}”</blockquote></div><div class="trail-step reviewer-read"><small>REVIEWER READ</small><p>${escapeHTML(item.body)}</p>${item.question?`<div class="review-question"><b>ASK</b> ${escapeHTML(item.question)}</div>`:""}</div><div class="trail-source"><div><small>ORIGINAL SOURCE</small><p>${href?`Attached by reviewer · <a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`:"Not attached · the cited material has not been independently checked."}</p></div><button id="attachSource">${href?"Replace source":"Attach source"}</button></div>`;
  $("#attachSource").onclick=()=>{const value=prompt("Paste the original source URL");if(!value?.trim())return;try{const url=new URL(value.trim());if(!["http:","https:"].includes(url.protocol))throw new Error();sourceLinks[item.id]=url.href;try{localStorage.setItem("lucent-source-links",JSON.stringify(sourceLinks))}catch{}renderTrail();toast("Source attached. It has not been independently checked.")}catch{toast("Enter a valid http or https link")}};
}

function updateProgress(){
  if(!liveDoc){$("#coverageLabel").textContent="—";$("#coverageFill").style.width="0%";$("#reviewProgress").textContent="Choose a document to start an AI review";return}
  const pct=Math.round(explored.size/Math.max(findings.length,1)*100);$("#coverageLabel").textContent=`${pct}%`;$("#coverageFill").style.width=`${pct}%`;$("#reviewProgress").textContent=`${explored.size} of ${findings.length} observations explored`;
}

function selectFinding(id){
  const item=findings.find(candidate=>candidate.id===id);if(!item)return;selectedId=id;explored.add(id);if(item.page&&liveDoc)page=liveDoc.pages.findIndex(candidate=>candidate.number===item.page)+1;updateProgress();render();document.querySelector(`.hl[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"});
}

async function analyzeFile(file){
  if(!file)return;const button=$("#chooseDocument");button.disabled=true;button.textContent="Reviewing…";$("#reviewStatus").textContent="Reading the document";$("#reviewProgress").textContent="Extracting text and tracing claims";
  const body=new FormData();body.append("document",file);
  try{const response=await fetch("/api/analyze",{method:"POST",body});const data=await response.json();if(!response.ok)throw new Error(data.error||"The review could not be completed.");
    liveDoc=data;findings=data.findings.map(item=>({...item}));explored=new Set();resolved=new Set();activeFilter="all";selectedId=findings[0]?.id||null;page=1;
    $("#reviewStatus").textContent="AI review complete";$("#introDeck").textContent=data.summary;$("#reviewProgress").textContent=`${findings.length} observations · ${data.model}`;updateProgress();render();toast(`${findings.length} findings grounded in your document`);
  }catch(error){const limitReached=/credits|rate limit|quota/i.test(error.message);const outOfCredits=/no credits remaining/i.test(error.message);$("#reviewStatus").textContent=outOfCredits?"API credits needed":limitReached?"AI usage limit reached":"Review not completed";$("#reviewProgress").textContent=outOfCredits?"Add API credits in OpenAI Platform, then retry":limitReached?"Check your AI provider quota, then retry":"Your sample review is still here";toast(error.message)}
  finally{button.disabled=false;button.textContent="Choose a document";$("#fileInput").value=""}
}

document.querySelectorAll(".lens").forEach(button=>button.addEventListener("click",()=>{activeFilter=button.dataset.filter;render()}));
document.addEventListener("click",event=>{const mark=event.target.closest(".hl");if(mark)selectFinding(mark.dataset.id)});
document.addEventListener("keydown",event=>{const mark=event.target.closest?.(".hl");if(mark&&(event.key==="Enter"||event.key===" ")){event.preventDefault();selectFinding(mark.dataset.id)}});
$("#prevFinding").addEventListener("click",()=>{const index=findings.findIndex(item=>item.id===selectedId);if(findings.length)selectFinding(findings[(index+findings.length-1)%findings.length].id)});
$("#nextFinding").addEventListener("click",()=>{const index=findings.findIndex(item=>item.id===selectedId);if(findings.length)selectFinding(findings[(index+1)%findings.length].id)});
$("#prevPage").addEventListener("click",()=>{if(liveDoc){page=Math.max(1,page-1);render()}else toast("Upload a document to navigate pages")});
$("#nextPage").addEventListener("click",()=>{if(liveDoc){page=Math.min(liveDoc.pages.length,page+1);render()}else toast("Upload a document to navigate pages")});
$("#textSize").addEventListener("click",()=>{largeText=!largeText;$("#paper").style.fontSize=largeText?"1.08em":"1em";toast(largeText?"Reading size increased":"Reading size reset")});
$("#filterBtn").addEventListener("click",()=>{const choices=["all","evidence","omissions","framing"],index=choices.indexOf(activeFilter);activeFilter=choices[(index+1)%choices.length];render();toast(`Showing ${activeFilter==="all"?"all observations":activeFilter}`)});
$("#sortBtn").addEventListener("click",()=>{oldest=!oldest;$("#sortBtn").textContent=oldest?"Oldest first⌄":"Newest first⌄";render()});
$("#addNote").addEventListener("click",()=>{const note=prompt("What would you like to remember about this document?");if(!note?.trim())return;const id=`note-${Date.now()}`;findings.push({id,type:"note",name:"Your note",severity:"PERSONAL NOTE",title:note.trim(),body:"A note you added to this review.",source:`Page ${String(liveDoc?.pages[page-1]?.number||page).padStart(2,"0")}`,page:liveDoc?.pages[page-1]?.number||page,quote:note.trim(),question:""});selectedId=id;explored.add(id);updateProgress();render();toast("Note added to your review")});
$("#lensHelp").addEventListener("click",()=>toast("Evidence checks support. Blind spots look for missing context. Framing checks how the claim is presented."));
$("#finishBtn").addEventListener("click",()=>toast(!liveDoc?"Open a document to begin your review":explored.size===findings.length?"Review complete. Your notes are ready.":`${findings.length-explored.size} observations left to explore`));
$("#shareBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);toast("Review link copied")}catch{toast("This review is private to your workspace")}});
$("#chooseDocument").addEventListener("click",()=>$("#fileInput").click());$("#fileInput").addEventListener("change",event=>analyzeFile(event.target.files[0]));
$("#paper").addEventListener("dragover",event=>{event.preventDefault();$("#paper").classList.add("drag-over")});$("#paper").addEventListener("dragleave",()=>$("#paper").classList.remove("drag-over"));$("#paper").addEventListener("drop",event=>{event.preventDefault();$("#paper").classList.remove("drag-over");analyzeFile(event.dataTransfer.files[0])});
fetch("/api/status").then(response=>response.json()).then(status=>{$("#uploadDisclosure").textContent=status.notice||"Lucent does not store uploads.";if(status.issue){const outOfCredits=/no credits remaining/i.test(status.issue);$("#reviewStatus").textContent=outOfCredits?"API credits needed":"AI usage limit reached";$("#reviewProgress").textContent=outOfCredits?"Add API credits, then retry":"Check your AI provider quota, then retry"}else if(status.ready){$("#reviewStatus").textContent=status.provider==="ollama"?"Local AI ready":"AI review ready";$("#reviewProgress").textContent=status.setup}else{$("#reviewStatus").textContent=status.provider==="ollama"?"Local model unavailable":"AI key needed";$("#reviewProgress").textContent=status.setup}}).catch(()=>{$("#reviewStatus").textContent="Start Lucent server";$("#reviewProgress").textContent="Run npm start to enable document upload and AI review"});
updateProgress();render();
