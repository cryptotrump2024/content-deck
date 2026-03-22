// ContentDeck v3.0 — Actions, Editor, Archive, Settings (Twitter + LinkedIn)

// ============ SHARED ACTIONS ============

function isMobile(){return window.innerWidth<=768}

function selectTweet(id){
  selectedId=id;editMode=false;renderSidebar();renderDetail();
  // On mobile, slide detail panel in and hide sidebar
  if(isMobile()){
    const sidebar=document.querySelector('.sidebar');
    const detail=document.getElementById('detailPanel');
    if(sidebar)sidebar.classList.add('slide-out');
    if(detail){detail.classList.add('active');requestAnimationFrame(()=>detail.classList.add('slide-in'));}
    const backBtn=document.getElementById('mobileBackBtn');
    if(backBtn)backBtn.style.display='flex';
    // Update bottom nav — hide page buttons, show back
    document.querySelectorAll('.bottom-nav-btn[data-page]').forEach(b=>b.style.display='none');
    const newBtn=document.querySelector('.bottom-nav-new');
    if(newBtn)newBtn.style.display='none';
  }
}

function navigateBack(){
  if(!isMobile())return;
  selectedId=null;editMode=false;
  const sidebar=document.querySelector('.sidebar');
  const detail=document.getElementById('detailPanel');
  if(detail)detail.classList.remove('slide-in');
  setTimeout(()=>{
    if(detail){detail.classList.remove('active');}
    if(sidebar)sidebar.classList.remove('slide-out');
  },300);
  const backBtn=document.getElementById('mobileBackBtn');
  if(backBtn)backBtn.style.display='none';
  // Restore bottom nav
  document.querySelectorAll('.bottom-nav-btn[data-page]').forEach(b=>b.style.display='');
  const newBtn=document.querySelector('.bottom-nav-new');
  if(newBtn)newBtn.style.display='';
  renderSidebar();
}

function mobileNavTo(page){
  // Navigate back to list first if in detail view
  navigateBack();
  setTimeout(()=>navigateTo(page), isMobile()&&selectedId?310:0);
  // Update bottom nav active state
  document.querySelectorAll('.bottom-nav-btn[data-page]').forEach(b=>{
    b.classList.toggle('active', b.dataset.page===page);
  });
}

function createNewPost(){
  if (currentPlatform === 'linkedin') {
    createNewLinkedinPost();
  } else {
    createNewTweet();
  }
}

function createNewTweet(){
  const tw={id:genId(),text:'',status:'draft',platform:'twitter',threadId:null,threadPosition:null,images:[],hashtags:[],sourceUrl:'',tags:[],topics:[],notes:'',linkedinText:'',linkedinHashtags:[],linkedinTopic:'',linkedinStatus:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sentAt:null,plannedDate:null,imagePath:''};
  activeTweets.unshift(tw);saveData();selectedId=tw.id;editMode=true;renderSidebar();renderDetail();
}

function createNewLinkedinPost(){
  const tw={id:genId(),text:'',linkedinText:'',status:'draft',platform:'linkedin',threadId:null,threadPosition:null,images:[],hashtags:[],linkedinHashtags:[],linkedinTopic:'',linkedinStatus:null,sourceUrl:'',tags:[],topics:[],notes:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sentAt:null,plannedDate:null,imagePath:''};
  activeTweets.unshift(tw);saveData();selectedId=tw.id;editMode=true;renderSidebar();renderDetail();
}

// Alias for backward compat
function createNewTweetAlias() { createNewTweet(); }

function startEdit(){editMode=true;renderDetail()}
function startThreadEdit(tid){
  editMode=true;const tts=getThread(tid);const p=document.getElementById('detailPanel');
  let h='';tts.forEach((t,i)=>{const ch=t.text.length;h+=`<div class="thread-tweet-editor" data-tweet-id="${t.id}"><span class="thread-num">${i+1}/${tts.length}</span>${tts.length>1?`<button class="thread-remove-btn" onclick="removeThreadTweet('${tid}','${t.id}')">${I.x}</button>`:''}<textarea oninput="updateThreadCC(this,'${t.id}')" id="threadTA_${t.id}">${t.text}</textarea><div class="char-info"><span style="color:${ccol(ch)}" id="threadCC_${t.id}">${ch}/280</span></div></div>`});
  p.innerHTML=`<div class="detail-view animate-in"><div class="detail-toolbar"><div class="detail-toolbar-left"><span style="font-size:14px;font-weight:600">Editing Thread (${tts.length} tweets)</span></div><div class="detail-toolbar-right"><button class="btn btn-secondary" onclick="addThreadTweet('${tid}')">+ Add Tweet</button><button class="btn btn-ghost" onclick="cancelEdit()">Cancel</button><button class="btn btn-primary" onclick="saveThreadEdit('${tid}')">Save</button></div></div><div class="detail-body"><div class="editor-container">${h}</div></div></div>`;
}
function cancelEdit(){
  const tw=activeTweets.find(t=>t.id===selectedId);
  if(tw){
    const text = (tw.platform === 'linkedin') ? (tw.linkedinText || tw.text) : tw.text;
    if(text===''&&!tw.threadId){activeTweets=activeTweets.filter(t=>t.id!==selectedId);saveData();selectedId=null}
  }
  editMode=false;renderSidebar();renderDetail();
}

// ============ TWITTER EDITOR ============

function saveEdit(){
  const tw=activeTweets.find(t=>t.id===selectedId);if(!tw)return;
  const ta=document.getElementById('editTextarea'),ne=document.getElementById('editNotes'),su=document.getElementById('editSourceUrl'),tp=document.getElementById('editTopics');
  
  const charCount = ta.value.length;
  if(charCount > 280) {
    showToast(`Tweet too long: ${charCount}/280 characters. Remove ${charCount - 280} chars.`, 'error');
    return;
  }
  
  tw.text=ta.value;tw.notes=ne?ne.value:tw.notes;tw.sourceUrl=su?su.value.trim():(tw.sourceUrl||'');
  if(tp){tw.topics=tp.value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)}
  tw.updatedAt=new Date().toISOString();
  const dupes=checkDupes(tw.topics||[],tw.id);
  saveData();editMode=false;renderSidebar();renderDetail();
  if(dupes.length)showToast('Warning: Topic overlap detected','error');
  else showToast('Tweet saved','success');
}

function renderEditor(tw){
  const ch=tw.text.length,pct=Math.min((ch/280)*100,100);
  return `<div class="detail-view animate-in"><div class="detail-toolbar"><div class="detail-toolbar-left"><span style="font-size:14px;font-weight:600">Editing Tweet</span><span class="platform-badge twitter">${I.twitter} Twitter</span></div><div class="detail-toolbar-right"><button class="btn btn-secondary" onclick="openImportUrlModal()" style="font-size:12px">${I.link} Import Article</button><button class="btn btn-ghost" onclick="cancelEdit()">Cancel</button><button class="btn btn-primary" onclick="saveEdit()">Save Changes</button></div></div><div class="detail-body"><div class="editor-container"><div class="editor-section-label">Tweet Text</div><textarea class="editor-textarea" id="editTextarea" oninput="updateEditCC()" maxlength="280">${tw.text}</textarea><div class="char-bar-container" style="margin-top:8px"><div class="char-bar-track"><div class="char-bar-fill" id="editCharBar" style="width:${pct}%;background:${ccol(ch)}"></div></div><div class="char-bar-labels"><span class="char-bar-count" id="editCharCount" style="color:${ccol(ch)}">${ch} / 280</span><span class="char-bar-limit" id="editCharRem">${ch>280?(ch-280)+' over':(280-ch)+' remaining'}</span></div></div></div><div class="editor-container" style="margin-top:4px"><div class="editor-section-label">Topics (comma-separated, for duplicate detection)</div><input type="text" id="editTopics" value="${(tw.topics||[]).join(', ')}" placeholder="etf, regulation, mining..." class="editor-url-input" style="color:var(--text-primary)"></div><div class="editor-container" style="margin-top:4px"><div class="editor-section-label">Notes (internal)</div><textarea class="editor-notes" id="editNotes">${tw.notes||''}</textarea></div><div class="editor-container" style="margin-top:4px"><div class="editor-section-label">${I.hash} Hashtags <span style="font-size:10px;font-weight:400;color:var(--text-tertiary);text-transform:none;letter-spacing:0">&mdash; click chip to insert into text</span></div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${(tw.hashtags||[]).map(h=>`<span class="hashtag-chip" style="cursor:pointer" title="Click to insert into tweet" onclick="insertHashtagIntoText('${h}','editTextarea')">#${h} <span class="remove-tag" onclick="event.stopPropagation();removeHashtag('${h}')">${I.x}</span></span>`).join('')}<input type="text" id="hashtagInput" placeholder="Add hashtag..." style="background:transparent;border:1px solid var(--border-subtle);border-radius:6px;padding:4px 8px;color:var(--twitter-blue);font-family:inherit;font-size:12px;width:120px;outline:none" onkeydown="handleHashtagKey(event)"></div></div><div class="editor-container" style="margin-top:4px"><div class="editor-section-label">${I.link} Source URL</div><input type="url" id="editSourceUrl" value="${tw.sourceUrl||''}" placeholder="https://..." class="editor-url-input"><div style="margin-top:6px"><button class="btn btn-secondary" onclick="openImportUrlModal()" style="font-size:11px;padding:4px 10px;gap:4px">${I.link} Import from URL</button></div></div><div class="editor-container" style="margin-top:4px"><div class="editor-section-label">Tags (internal)</div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${(tw.tags||[]).map(t=>`<span class="tag">${t} <span class="remove-tag" onclick="removeTag('${t}')">${I.x}</span></span>`).join('')}<input type="text" id="tagInput" placeholder="Add..." style="background:transparent;border:1px solid var(--border-subtle);border-radius:6px;padding:4px 8px;color:var(--text-primary);font-family:inherit;font-size:12px;width:100px;outline:none" onkeydown="handleTagKey(event)"></div></div></div></div>`;
}

function updateEditCC(){const ta=document.getElementById('editTextarea');if(!ta)return;const c=ta.value.length,p=Math.min((c/280)*100,100);const b=document.getElementById('editCharBar'),ct=document.getElementById('editCharCount'),r=document.getElementById('editCharRem');if(b){b.style.width=p+'%';b.style.background=ccol(c)}if(ct){ct.textContent=c+' / 280';ct.style.color=ccol(c)}if(r)r.textContent=c>280?(c-280)+' over':(280-c)+' remaining'}
function updateThreadCC(ta,id){const c=ta.value.length;const el=document.getElementById('threadCC_'+id);if(el){el.textContent=c+'/280';el.style.color=ccol(c)}}

// ============ LINKEDIN EDITOR ============

function renderLinkedinEditor(tw) {
  const text = tw.linkedinText || tw.text;
  const ch = text.length;
  const limit = 3000;
  const pct = Math.min((ch / limit) * 100, 100);
  const hashtags = tw.linkedinHashtags || [];
  const topic = tw.linkedinTopic || '';
  const suggestions = LINKEDIN_HASHTAG_SUGGESTIONS[topic] || LINKEDIN_HASHTAG_SUGGESTIONS[''];
  
  let topicOpts = LINKEDIN_TOPICS.map(t => 
    `<option value="${t.value}" ${t.value === topic ? 'selected' : ''}>${t.label}</option>`
  ).join('');
  
  return `<div class="detail-view animate-in">
    <div class="detail-toolbar">
      <div class="detail-toolbar-left">
        <span style="font-size:14px;font-weight:600">Editing LinkedIn Post</span>
        <span class="platform-badge linkedin">${I.linkedin} LinkedIn</span>
      </div>
      <div class="detail-toolbar-right">
        <button class="btn btn-ghost" onclick="cancelEdit()">Cancel</button>
        <button class="btn btn-linkedin" onclick="saveLinkedinEdit()">Save Changes</button>
      </div>
    </div>
    <div class="detail-body">
      <!-- Import options -->
      <div class="editor-container" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="import-adapt-btn" onclick="openImportModal()">
          ${I.importArrow}
          Import &amp; Adapt from Twitter
        </button>
        <button class="btn btn-secondary" onclick="openImportUrlModal()" style="font-size:12px;padding:6px 12px;gap:5px">${I.link} Import from URL</button>
      </div>
      
      <!-- Topic Selector -->
      <div class="editor-container">
        <div class="editor-section-label">Topic Category</div>
        <select class="linkedin-topic-select" id="editLinkedinTopic" onchange="onLinkedinTopicChange()">
          ${topicOpts}
        </select>
      </div>
      
      <!-- Main Text -->
      <div class="editor-container">
        <div class="editor-section-label">Post Text</div>
        <textarea class="editor-textarea linkedin-editor" id="editLinkedinTextarea" oninput="updateLinkedinEditCC()" placeholder="Write your LinkedIn post here...&#10;&#10;Tips:&#10;&#8226; Use multiple paragraphs for readability&#10;&#8226; Professional but conversational tone&#10;&#8226; Include a question to drive engagement&#10;&#8226; 3,000 character limit gives you room to go deep">${text}</textarea>
        <div class="char-bar-container" style="margin-top:8px">
          <div class="char-bar-track">
            <div class="char-bar-fill" id="editLinkedinCharBar" style="width:${pct}%;background:${charColor(ch, 'linkedin')}"></div>
          </div>
          <div class="char-bar-labels">
            <span class="char-bar-count" id="editLinkedinCharCount" style="color:${charColor(ch, 'linkedin')}">${ch} / ${limit}</span>
            <span class="char-bar-limit" id="editLinkedinCharRem">${ch > limit ? (ch - limit) + ' over' : (limit - ch) + ' remaining'}</span>
          </div>
        </div>
      </div>
      
      <!-- Hashtags -->
      <div class="editor-container">
        <div class="editor-section-label">${I.hash} Hashtags</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${hashtags.map(h => `<span class="hashtag-chip linkedin" style="cursor:pointer" title="Click to insert into post" onclick="insertHashtagIntoText('${h}','editLinkedinTextarea')">#${h} <span class="remove-tag" onclick="event.stopPropagation();removeLinkedinHashtag('${h}')">${I.x}</span></span>`).join('')}
          <input type="text" id="linkedinHashtagInput" placeholder="Add hashtag..." style="background:transparent;border:1px solid var(--border-subtle);border-radius:6px;padding:4px 8px;color:var(--linkedin-blue);font-family:inherit;font-size:12px;width:120px;outline:none" onkeydown="handleLinkedinHashtagKey(event)">
        </div>
        <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:4px">Suggestions — click to add to list &amp; insert into text:</div>
        <div class="hashtag-suggestions" id="hashtagSuggestions">
          ${suggestions.map(h => {
            const added = hashtags.includes(h);
            return `<span class="hashtag-suggestion${added ? ' added' : ''}" title="${added ? 'Click to insert into post' : 'Click to add & insert'}" onclick="toggleLinkedinHashtag('${h}');insertHashtagIntoText('${h}','editLinkedinTextarea')">#${h}${added ? ' ✓' : ''}</span>`;
          }).join('')}
        </div>
      </div>
      
      <!-- Notes -->
      <div class="editor-container">
        <div class="editor-section-label">Notes (internal)</div>
        <textarea class="editor-notes" id="editLinkedinNotes">${tw.notes || ''}</textarea>
      </div>
      
      <!-- Live Preview -->
      <div class="editor-container">
        <div class="editor-section-label">Live Preview</div>
        <div id="linkedinLivePreview">${linkedinPreviewHTML(tw)}</div>
      </div>
    </div>
  </div>`;
}

function updateLinkedinEditCC() {
  const ta = document.getElementById('editLinkedinTextarea');
  if (!ta) return;
  const c = ta.value.length;
  const limit = 3000;
  const pct = Math.min((c / limit) * 100, 100);
  
  const bar = document.getElementById('editLinkedinCharBar');
  const count = document.getElementById('editLinkedinCharCount');
  const rem = document.getElementById('editLinkedinCharRem');
  
  if (bar) { bar.style.width = pct + '%'; bar.style.background = charColor(c, 'linkedin'); }
  if (count) { count.textContent = c + ' / ' + limit; count.style.color = charColor(c, 'linkedin'); }
  if (rem) rem.textContent = c > limit ? (c - limit) + ' over' : (limit - c) + ' remaining';
  
  // Update live preview
  updateLinkedinLivePreview();
}

function updateLinkedinLivePreview() {
  const tw = activeTweets.find(t => t.id === selectedId);
  if (!tw) return;
  const ta = document.getElementById('editLinkedinTextarea');
  const preview = document.getElementById('linkedinLivePreview');
  if (!ta || !preview) return;
  
  // Create a temporary copy for preview
  const tempTw = { ...tw, linkedinText: ta.value };
  preview.innerHTML = linkedinPreviewHTML(tempTw);
}

function onLinkedinTopicChange() {
  const select = document.getElementById('editLinkedinTopic');
  if (!select) return;
  const topic = select.value;
  const tw = activeTweets.find(t => t.id === selectedId);
  if (!tw) return;
  
  // Update suggestions
  const suggestions = LINKEDIN_HASHTAG_SUGGESTIONS[topic] || LINKEDIN_HASHTAG_SUGGESTIONS[''];
  const hashtags = tw.linkedinHashtags || [];
  const container = document.getElementById('hashtagSuggestions');
  if (container) {
    container.innerHTML = suggestions.map(h => {
      const added = hashtags.includes(h);
      return `<span class="hashtag-suggestion${added ? ' added' : ''}" title="${added ? 'Click to insert into post' : 'Click to add & insert'}" onclick="toggleLinkedinHashtag('${h}');insertHashtagIntoText('${h}','editLinkedinTextarea')">#${h}${added ? ' ✓' : ''}</span>`;
    }).join('');
  }
}

function saveLinkedinEdit() {
  const tw = activeTweets.find(t => t.id === selectedId);
  if (!tw) return;
  
  const ta = document.getElementById('editLinkedinTextarea');
  const ne = document.getElementById('editLinkedinNotes');
  const tp = document.getElementById('editLinkedinTopic');
  
  const charCount = ta.value.length;
  if (charCount > 3000) {
    showToast(`Post too long: ${charCount}/3,000 characters. Remove ${charCount - 3000} chars.`, 'error');
    return;
  }
  
  tw.linkedinText = ta.value;
  tw.text = ta.value; // Keep text in sync for search
  tw.notes = ne ? ne.value : tw.notes;
  tw.linkedinTopic = tp ? tp.value : tw.linkedinTopic;
  tw.updatedAt = new Date().toISOString();
  
  saveData();
  editMode = false;
  renderSidebar();
  renderDetail();
  showToast('LinkedIn post saved', 'success');
}

// LinkedIn hashtag management
function handleLinkedinHashtagKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const inp = document.getElementById('linkedinHashtagInput');
    let v = inp.value.trim();
    if (v.startsWith('#')) v = v.slice(1);
    if (!v) return;
    const tw = activeTweets.find(t => t.id === selectedId);
    if (!tw.linkedinHashtags) tw.linkedinHashtags = [];
    if (!tw.linkedinHashtags.includes(v)) {
      tw.linkedinHashtags.push(v);
      saveData();
      renderDetail();
    }
    inp.value = '';
  }
}

function removeLinkedinHashtag(h) {
  const tw = activeTweets.find(t => t.id === selectedId);
  if (tw && tw.linkedinHashtags) {
    tw.linkedinHashtags = tw.linkedinHashtags.filter(x => x !== h);
    saveData();
    renderDetail();
  }
}

function toggleLinkedinHashtag(h) {
  const tw = activeTweets.find(t => t.id === selectedId);
  if (!tw) return;
  if (!tw.linkedinHashtags) tw.linkedinHashtags = [];
  
  if (tw.linkedinHashtags.includes(h)) {
    tw.linkedinHashtags = tw.linkedinHashtags.filter(x => x !== h);
  } else {
    tw.linkedinHashtags.push(h);
  }
  saveData();
  // Re-render just the editor to keep cursor position
  const ta = document.getElementById('editLinkedinTextarea');
  const cursorPos = ta ? ta.selectionStart : 0;
  renderDetail();
  setTimeout(() => {
    const newTa = document.getElementById('editLinkedinTextarea');
    if (newTa) { newTa.selectionStart = cursorPos; newTa.selectionEnd = cursorPos; }
  }, 50);
}

// Import from Twitter modal
function openImportModal() {
  const twitterTweets = activeTweets.filter(t => (t.platform || 'twitter') === 'twitter' && t.text.length > 0);
  const list = document.getElementById('importTweetList');
  
  if (twitterTweets.length === 0) {
    list.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-tertiary)">No Twitter tweets to import. Create some tweets first.</div>`;
  } else {
    list.innerHTML = twitterTweets.map(tw => `
      <div class="import-tweet-item" onclick="importAndAdapt('${tw.id}')">
        <div class="import-tweet-item-text">${tw.text}</div>
        <div class="import-tweet-item-meta">
          <span class="status-badge ${tw.status}"><span class="status-dot"></span>${tw.status}</span>
          <span>${tw.text.length}/280 chars</span>
          <span>${fmtD(tw.createdAt)}</span>
        </div>
      </div>
    `).join('');
  }
  
  document.getElementById('importModal').classList.add('show');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('show');
}

function importAndAdapt(tweetId) {
  const sourceTweet = activeTweets.find(t => t.id === tweetId);
  if (!sourceTweet) return;
  
  const tw = activeTweets.find(t => t.id === selectedId);
  if (!tw) return;
  
  // Adapt the text
  const adapted = adaptTextToLinkedin(sourceTweet.text);
  tw.linkedinText = adapted;
  tw.text = adapted;
  
  // Copy relevant metadata
  if (sourceTweet.topics) tw.topics = [...sourceTweet.topics];
  if (sourceTweet.hashtags) {
    tw.linkedinHashtags = [...new Set([...(tw.linkedinHashtags || []), ...sourceTweet.hashtags])];
  }
  if (sourceTweet.sourceUrl && !tw.sourceUrl) tw.sourceUrl = sourceTweet.sourceUrl;
  tw.notes = (tw.notes ? tw.notes + '\n' : '') + `Adapted from tweet: ${sourceTweet.id}`;
  tw.updatedAt = new Date().toISOString();
  
  saveData();
  closeImportModal();
  renderDetail();
  showToast('Tweet imported and adapted for LinkedIn', 'success');
}

// Copy LinkedIn text to clipboard
async function copyLinkedinText(id) {
  const tw = activeTweets.find(t => t.id === id);
  if (!tw) return;
  const text = tw.linkedinText || tw.text;
  const hashtags = (tw.linkedinHashtags || []).map(h => '#' + h).join(' ');
  const fullText = hashtags ? text + '\n\n' + hashtags : text;
  
  try {
    await navigator.clipboard.writeText(fullText);
    const b = document.getElementById('copyBtn');
    if (b) {
      b.classList.add('copied');
      b.innerHTML = I.check + ' Copied!';
      setTimeout(() => { b.classList.remove('copied'); b.innerHTML = I.copy + ' Copy Text'; }, 2000);
    }
    showToast('Copied! Ready to paste into LinkedIn.', 'success');
  } catch (e) {
    showToast('Copy failed', 'error');
  }
}

// ============ SHARED ACTIONS (Status, Archive, Delete) ============

function changeStatus(id,ns){
  const tw=activeTweets.find(t=>t.id===id);if(!tw)return;
  if(tw.threadId){getThread(tw.threadId).forEach(t=>{t.status=ns;t.updatedAt=new Date().toISOString();if(ns==='sent')t.sentAt=new Date().toISOString()})}
  else{tw.status=ns;tw.updatedAt=new Date().toISOString();if(ns==='sent')tw.sentAt=new Date().toISOString()}
  saveData();renderSidebar();renderDetail();showToast('Status: '+ns,'success');
}

function archiveTweet(id){
  const tw=activeTweets.find(t=>t.id===id);if(!tw)return;
  tw.status='sent';tw.sentAt=new Date().toISOString();tw.updatedAt=new Date().toISOString();
  const archived={...tw,archivedAt:new Date().toISOString()};
  if(tw.threadId){
    const tts=getThread(tw.threadId);
    tts.forEach(t=>{t.status='sent';t.sentAt=new Date().toISOString();const a={...t,archivedAt:new Date().toISOString()};sentTweets.push(a);pushToSupabase(a)});
    activeTweets=activeTweets.filter(t=>t.threadId!==tw.threadId);
  }else{
    sentTweets.push(archived);
    activeTweets=activeTweets.filter(t=>t.id!==id);
    pushToSupabase(archived);
  }
  selectedId=null;saveData();renderSidebar();renderDetail();showToast('Moved to archive','success');
}

// ============ IMPORT ARTICLE URL ============
function openImportUrlModal(){
  document.getElementById('importUrlModal').classList.add('show');
  document.getElementById('importUrlPreview').style.display='none';
  document.getElementById('importUrlInput').value='';
  setTimeout(()=>document.getElementById('importUrlInput').focus(),100);
}
function closeImportUrlModal(){document.getElementById('importUrlModal').classList.remove('show')}

async function importFromUrl(){
  const inp=document.getElementById('importUrlInput');
  const url=inp.value.trim();
  if(!url||!url.startsWith('http')){showToast('Enter a valid URL','error');return}
  const btn=document.getElementById('importUrlBtn');
  if(btn){btn.textContent='Fetching...';btn.disabled=true}
  try{
    const r=await fetch(AB+'/api/fetch-article',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const d=await r.json();
    if(r.ok&&d.title){
      const preview=document.getElementById('importUrlPreview');
      preview.style.display='block';
      preview.innerHTML=`<strong>${d.title}</strong><br><span style="font-size:12px;opacity:0.7">${url}</span>`;
      // Create tweet draft with article title + URL
      const tweetText=d.title.length+url.length+2<=278?`${d.title}\n\n${url}`:`${d.title.slice(0,277-url.length)}…\n${url}`;
      closeImportUrlModal();
      const tw={id:genId(),text:tweetText,status:'draft',platform:'twitter',threadId:null,threadPosition:null,images:[],hashtags:[],sourceUrl:url,tags:[],topics:[],notes:'Imported from: '+url,linkedinText:'',linkedinHashtags:[],linkedinTopic:'',linkedinStatus:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sentAt:null,plannedDate:null,imagePath:''};
      activeTweets.unshift(tw);saveData();selectedId=tw.id;editMode=true;
      // Also switch to twitter platform to see it
      if(currentPlatform!=='twitter'){currentPlatform='twitter';localStorage.setItem('active_platform','twitter')}
      renderPage();showToast('Article imported as tweet draft','success');
    }else{
      showToast('Could not fetch article title — URL will be used as text','error');
    }
  }catch(e){showToast('Import failed: '+e.message,'error')}
  if(btn){btn.textContent='Import as Tweet';btn.disabled=false}
}

// ============ SUPABASE ============
async function pushToSupabase(item){
  try{
    const r=await fetch(AB+'/api/supabase/push-item',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
    if(r.ok){item.synced=true;saveData()}
  }catch(e){}// fire-and-forget, silent fail
}

async function syncAllToSupabase(){
  showToast('Syncing to Supabase...','success');
  try{
    const r=await fetch(AB+'/api/supabase/sync-archive',{method:'POST'});
    const d=await r.json();
    if(r.ok){sentTweets.forEach(t=>t.synced=true);saveData();renderArchive();showToast('Synced '+d.synced+' items to Supabase','success')}
    else showToast('Sync failed: '+(d.message||r.status),'error');
  }catch(e){showToast('Sync error: '+e.message,'error')}
}

async function testSupabaseConnection(){
  const btn=document.getElementById('testSbBtn');
  if(btn){btn.textContent='Testing...';btn.disabled=true}
  try{
    const r=await fetch(AB+'/api/supabase/status');
    const d=await r.json();
    const el=document.getElementById('sbStatus');
    if(el){
      if(d.connected){
        el.className='supabase-status connected';
        el.innerHTML='<span class="supabase-status-dot"></span> Connected &mdash; '+d.count+' items synced'+(d.lastSync?' &middot; Last: '+new Date(d.lastSync).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'');
      }else{
        el.className='supabase-status disconnected';
        el.innerHTML='<span class="supabase-status-dot"></span> '+(d.message||'Not connected');
      }
    }
    showToast(d.connected?'Supabase connected ('+d.count+' items)':'Not connected: '+(d.message||'Check credentials'),d.connected?'success':'error');
  }catch(e){showToast('Test failed: '+e.message,'error')}
  if(btn){btn.textContent='Test Connection';btn.disabled=false}
}

async function saveSupabaseConfig(){
  const url=(document.getElementById('sbUrl')||{}).value||'';
  const key=(document.getElementById('sbKey')||{}).value||'';
  if(!url||!key){showToast('Enter URL and Key first','error');return}
  try{
    const r=await fetch(AB+'/api/supabase/save-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,key})});
    if(r.ok){showToast('Supabase config saved','success');testSupabaseConnection()}
    else showToast('Save failed','error');
  }catch(e){showToast('Error: '+e.message,'error')}
}

// Twitter API — upload image (if any) then post tweet
async function sendToTwitter(id){
  const tw=activeTweets.find(t=>t.id===id);if(!tw)return;
  if(!settings.twitter_api.configured||!settings.twitter_api.bearer_token){showToast('Configure Twitter API in Settings','error');return}
  
  const hasImage=tw.imagePath&&tw.imagePath.trim()!=='';
  showToast(hasImage?'Uploading image & posting...':'Sending to Twitter...','success');
  
  try{
    let media_ids=[];
    
    // Step 1: Upload image if one exists
    if(hasImage){
      const uploadRes=await fetch('/api/twitter/upload-media',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({imagePath:tw.imagePath})
      });
      if(uploadRes.ok){
        const uploadData=await uploadRes.json();
        media_ids.push(uploadData.media_id);
        showToast('Image uploaded, posting tweet...','success');
      }else{
        const err=await uploadRes.json();
        // Non-fatal: post without image if upload fails
        showToast('Image upload failed, posting without image: '+(err.message||uploadRes.status),'error');
      }
    }
    
    // Step 2: Post tweet (with media_ids if upload succeeded)
    const postBody={text:tw.text};
    if(media_ids.length)postBody.media_ids=media_ids;
    
    const res=await fetch('/api/twitter/post',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(postBody)
    });
    if(res.ok){archiveTweet(id);showToast(media_ids.length?'Posted to Twitter with image and archived!':'Posted to Twitter and archived!','success')}
    else{const err=await res.json();showToast('Twitter error: '+(err.message||res.status),'error')}
  }catch(e){showToast('Failed: '+e.message,'error')}
}
async function testTwitterApi(){
  const btn=document.getElementById('testApiBtn');if(btn){btn.textContent='Testing...';btn.disabled=true}
  try{
    const res=await fetch('/api/twitter/test');
    if(res.ok){const d=await res.json();settings.twitter_api.last_tested=new Date().toISOString();settings.twitter_api.last_test_result='success';saveData();showToast('Twitter API Connected','success')}
    else{const d=await res.json();settings.twitter_api.last_test_result='error';showToast(d.message,'error')}
  }catch(e){showToast('Connection failed: '+e.message,'error')}
  if(btn){btn.textContent='Test Connection';btn.disabled=false}
  renderSettings();
}
function saveApiSettings(){
  const bt=document.getElementById('bearerToken').value.trim();
  const ak=document.getElementById('apiKeyId').value.trim();
  settings.twitter_api.bearer_token=bt;settings.twitter_api.api_key_id=ak;settings.twitter_api.configured=!!bt;
  saveData();updateHeader();showToast('API settings saved','success');renderSettings();
}

// Delete
function openDeleteModal(id){deleteTargetId=id;document.getElementById('deleteModal').classList.add('show')}
function closeDeleteModal(){deleteTargetId=null;document.getElementById('deleteModal').classList.remove('show')}
function confirmDelete(){
  if(!deleteTargetId)return;const tw=activeTweets.find(t=>t.id===deleteTargetId);
  if(tw&&tw.threadId)activeTweets=activeTweets.filter(t=>t.threadId!==tw.threadId);
  else activeTweets=activeTweets.filter(t=>t.id!==deleteTargetId);
  if(selectedId===deleteTargetId)selectedId=null;deleteTargetId=null;
  saveData();closeDeleteModal();renderSidebar();renderDetail();showToast('Deleted','success');
}

// Clipboard (Twitter)
async function copyText(id){
  const tw=activeTweets.find(t=>t.id===id);if(!tw)return;
  try{await navigator.clipboard.writeText(tw.text);const b=document.getElementById('copyBtn');if(b){b.classList.add('copied');b.innerHTML=I.check+' Copied!';setTimeout(()=>{b.classList.remove('copied');b.innerHTML=I.copy+' Copy Text'},2000)}showToast('Copied','success')}catch(e){showToast('Copy failed','error')}
}
async function copyThread(tid){
  const tts=getThread(tid);const t=tts.map((tw,i)=>`[${i+1}/${tts.length}]\n${tw.text}`).join('\n\n---\n\n');
  try{await navigator.clipboard.writeText(t);showToast('Thread copied','success')}catch(e){showToast('Copy failed','error')}
}

// Twitter Editor helpers
function handleTagKey(e){if(e.key==='Enter'){e.preventDefault();const inp=document.getElementById('tagInput'),v=inp.value.trim().toLowerCase();if(!v)return;const tw=activeTweets.find(t=>t.id===selectedId);if(tw&&!tw.tags.includes(v)){tw.tags.push(v);saveData();renderDetail()}inp.value=''}}
function removeTag(tag){const tw=activeTweets.find(t=>t.id===selectedId);if(tw){tw.tags=tw.tags.filter(t=>t!==tag);saveData();renderDetail()}}
function handleHashtagKey(e){if(e.key==='Enter'){e.preventDefault();const inp=document.getElementById('hashtagInput');let v=inp.value.trim();if(v.startsWith('#'))v=v.slice(1);if(!v)return;const tw=activeTweets.find(t=>t.id===selectedId);if(!tw.hashtags)tw.hashtags=[];if(!tw.hashtags.includes(v)){tw.hashtags.push(v);saveData();renderDetail()}inp.value=''}}
function removeHashtag(h){const tw=activeTweets.find(t=>t.id===selectedId);if(tw&&tw.hashtags){tw.hashtags=tw.hashtags.filter(x=>x!==h);saveData();renderDetail()}}

// Insert a hashtag into textarea at cursor position (Twitter or LinkedIn)
function insertHashtagIntoText(tag,textareaId){
  const ta=document.getElementById(textareaId);if(!ta)return;
  const val=ta.value,start=ta.selectionStart,end=ta.selectionEnd;
  const hashtag=(val.length===0||val[start-1]===' '||val[start-1]==='\n')?'#'+tag:' #'+tag;
  ta.value=val.slice(0,start)+hashtag+val.slice(end);
  const newPos=start+hashtag.length;
  ta.selectionStart=ta.selectionEnd=newPos;
  ta.focus();
  // Trigger char counter update
  ta.dispatchEvent(new Event('input'));
  showToast('#'+tag+' added to text','success');
}

function saveThreadEdit(tid){
  getThread(tid).forEach(t=>{const ta=document.getElementById('threadTA_'+t.id);if(ta){t.text=ta.value;t.updatedAt=new Date().toISOString()}});
  saveData();editMode=false;renderSidebar();renderDetail();showToast('Thread saved','success');
}
function addThreadTweet(tid){
  const tts=getThread(tid);
  const tw={id:genId(),text:'',status:tts[0].status,platform:'twitter',threadId:tid,threadPosition:tts.length,images:[],hashtags:[],sourceUrl:'',tags:[...tts[0].tags],topics:[...tts[0].topics||[]],notes:'',linkedinText:'',linkedinHashtags:[],linkedinTopic:'',linkedinStatus:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sentAt:null,plannedDate:null};
  activeTweets.push(tw);saveData();startThreadEdit(tid);
}
function removeThreadTweet(tid,twId){
  activeTweets=activeTweets.filter(t=>t.id!==twId);
  getThread(tid).forEach((t,i)=>{t.threadPosition=i});saveData();startThreadEdit(tid);
}

// ============ ARCHIVE PAGE ============

function renderArchive(){
  const page=document.getElementById('archivePage');
  const filtered=getFilteredArch();
  const syncedCount=sentTweets.filter(t=>t.synced).length;
  page.innerHTML=`<div class="archive-container"><div class="archive-header"><h2 style="font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px"><span style="width:22px;height:22px;display:inline-flex;flex-shrink:0">${I.archive}</span> Post Archive</h2><div style="display:flex;align-items:center;gap:10px"><span class="archive-count">${sentTweets.length} archived post${sentTweets.length!==1?'s':''}</span><button class="btn-sync" onclick="syncAllToSupabase()"><span style="display:inline-flex;align-items:center;width:13px;height:13px">${I.cloud}</span> Sync to Supabase${syncedCount?` (${syncedCount}/${sentTweets.length})`:''}  </button></div></div><div class="archive-filters"><input type="text" placeholder="Search archive..." class="search-input" style="max-width:300px" oninput="searchQuery=this.value;renderArchive()"><input type="text" placeholder="Filter by topic..." class="filter-input" value="${archiveFilter.topic}" oninput="archiveFilter.topic=this.value;renderArchive()"><input type="text" placeholder="Filter by hashtag..." class="filter-input" value="${archiveFilter.hashtag}" oninput="archiveFilter.hashtag=this.value;renderArchive()"><input type="date" class="filter-input" value="${archiveFilter.dateFrom}" onchange="archiveFilter.dateFrom=this.value;renderArchive()" title="From date"><input type="date" class="filter-input" value="${archiveFilter.dateTo}" onchange="archiveFilter.dateTo=this.value;renderArchive()" title="To date"></div><div class="archive-list">${filtered.length?filtered.map(tw=>{
    const isLi = (tw.platform || 'twitter') === 'linkedin';
    const text = isLi ? (tw.linkedinText || tw.text) : tw.text;
    const platformIcon = isLi ? `<span class="platform-badge linkedin">${I.linkedin} LI</span>` : `<span class="platform-badge twitter">${I.twitter} TW</span>`;
    const syncIcon=tw.synced?`<span class="archive-card-synced" title="Synced to Supabase">${I.cloudCheck}</span>`:'';
    return `<div class="archive-card"><div class="archive-card-header"><div style="display:flex;align-items:center;gap:8px"><span class="status-badge sent"><span class="status-dot"></span>Sent</span>${platformIcon}${syncIcon}</div><span class="archive-card-date">${fmtDT(tw.sentAt||tw.createdAt)}</span></div><div class="archive-card-text">${hl(text)}</div><div class="archive-card-meta">${(tw.topics||[]).length?`<div class="archive-topics">${tw.topics.map(t=>`<span class="tag" style="font-size:10px;padding:2px 6px">${t}</span>`).join('')}</div>`:''}${(tw.hashtags||[]).length?`<div class="archive-hashtags">${tw.hashtags.map(h=>`<span style="color:var(--twitter-blue);font-size:11px">#${h}</span>`).join(' ')}</div>`:''}${(tw.linkedinHashtags||[]).length?`<div class="archive-hashtags">${tw.linkedinHashtags.map(h=>`<span style="color:var(--linkedin-blue);font-size:11px">#${h}</span>`).join(' ')}</div>`:''}</div></div>`}).join(''):`<div style="padding:40px;text-align:center;color:var(--text-tertiary)">No archived posts${archiveFilter.topic||archiveFilter.hashtag||searchQuery?' matching filters':''}</div>`}</div></div>`;
}

// ============ SETTINGS PAGE ============

function renderSettings(){
  const page=document.getElementById('settingsPage');
  const api=settings.twitter_api;
  page.innerHTML=`<div class="settings-container"><h2 style="font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:24px"><span style="width:22px;height:22px;display:inline-flex;flex-shrink:0">${I.settings}</span> Settings</h2>
  
  <div class="settings-card"><div class="settings-section"><h3 style="font-size:15px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:8px"><span style="width:16px;height:16px;display:inline-flex;flex-shrink:0">${I.twitter}</span> Twitter API</h3><div class="api-status-indicator ${api.configured?'connected':'disconnected'}"><span class="api-status-dot"></span><span>${api.configured?'Connected':'Not configured'}</span></div>${api.last_tested?`<p style="font-size:12px;color:var(--text-tertiary);margin-top:4px">Last tested: ${fmtDT(api.last_tested)} &mdash; ${api.last_test_result==='success'?'Success':'Failed'}</p>`:''}</div><div class="settings-section"><div class="settings-field"><label>Bearer Token</label><input type="password" id="bearerToken" value="${api.bearer_token}" placeholder="Enter Twitter API v2 Bearer Token" class="settings-input"><p class="settings-hint">Required for posting tweets. Get yours at <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" style="color:var(--twitter-blue)">developer.twitter.com</a></p></div><div class="settings-field"><label>API Key ID (optional)</label><input type="text" id="apiKeyId" value="${api.api_key_id||''}" placeholder="App API Key for reference" class="settings-input"></div></div><div class="settings-actions"><button class="btn btn-secondary" id="testApiBtn" onclick="testTwitterApi()">Test Connection</button><button class="btn btn-primary" onclick="saveApiSettings()">Save Settings</button></div></div>
  
  <div class="settings-card" style="margin-top:16px"><div class="settings-section"><h3 style="font-size:15px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="width:16px;height:16px;display:inline-flex;flex-shrink:0">${I.linkedin}</span> LinkedIn</h3><p style="font-size:13px;color:var(--text-secondary);line-height:1.5">LinkedIn integration uses a manual copy/paste workflow. No API credentials needed. Create posts in the LinkedIn editor, copy the text, and paste it into LinkedIn.</p></div></div>
  
  <div class="settings-card" style="margin-top:16px"><div class="settings-section"><h3 style="font-size:15px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="width:16px;height:16px;display:inline-flex;flex-shrink:0">${I.cloud}</span> Supabase Archive Sync</h3><p style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px">Automatically sync archived posts to a Supabase table for backup, analytics, and cross-device access. Table required: <code style="font-family:'JetBrains Mono',monospace;font-size:12px;background:var(--bg-tertiary);padding:2px 6px;border-radius:4px">archived_posts</code></p><div id="sbStatus" class="supabase-status disconnected"><span class="supabase-status-dot"></span> Not configured</div></div><div class="settings-section"><div class="settings-field"><label>Supabase Project URL</label><input type="text" id="sbUrl" class="settings-input" placeholder="https://xxxx.supabase.co" style="font-family:'JetBrains Mono',monospace"></div><div class="settings-field"><label>Supabase Anon Key</label><input type="password" id="sbKey" class="settings-input" placeholder="eyJhbGciOiJIUzI1NiJ9..."><p class="settings-hint">Use the public anon key from your Supabase project Settings &rarr; API.</p></div></div><div class="settings-actions"><button class="btn btn-secondary" id="testSbBtn" onclick="testSupabaseConnection()">Test Connection</button><button class="btn btn-secondary" onclick="syncAllToSupabase()">Sync All Archives</button><button class="btn btn-primary" onclick="saveSupabaseConfig()">Save Config</button></div></div>
  
  <div class="settings-card" style="margin-top:16px"><h3 style="font-size:15px;font-weight:600;margin-bottom:8px">Data Management</h3><div class="settings-actions"><button class="btn btn-secondary" onclick="exportData()">Export All Data (JSON)</button><button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">Import Data</button><input type="file" id="importFile" accept=".json" style="display:none" onchange="importData(event)"></div></div></div>`;
}

function exportData(){
  const d={active_tweets:activeTweets,sent_tweets:sentTweets,settings,exported_at:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='contentdeck-export-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  showToast('Data exported','success');
}
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=function(ev){
    try{const d=JSON.parse(ev.target.result);if(d.active_tweets){activeTweets=d.active_tweets;sentTweets=d.sent_tweets||[];if(d.settings)settings=d.settings;saveData();renderPage();showToast('Data imported: '+activeTweets.length+' active, '+sentTweets.length+' archived','success')}else showToast('Invalid format','error')}catch(err){showToast('Import failed: '+err.message,'error')}
  };reader.readAsText(file);
}

// Filters & Search
function setFilter(f){
  currentFilter=f;
  // Clear new badge when switching away from "new"
  if(f!=='new'){}
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  document.querySelector(`.filter-pill[data-filter="${f}"]`).classList.add('active');
  renderSidebar();
}
function handleSearch(){searchQuery=document.getElementById('searchInput').value;renderSidebar()}

// Toast
let toastTimeout;
function showToast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+(type||'')+' show';clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{t.classList.remove('show')},2500)}

// Keyboard
document.addEventListener('keydown',e=>{
  const tag=e.target.tagName.toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select'){if(e.key==='Escape'){e.target.blur();if(editMode)cancelEdit()}return}
  const filtered=getFiltered();const idx=filtered.findIndex(t=>t.id===selectedId);
  switch(e.key){
    case'ArrowDown':case'j':e.preventDefault();if(filtered.length){const n=idx<filtered.length-1?idx+1:0;selectTweet(filtered[n].id)}break;
    case'ArrowUp':case'k':e.preventDefault();if(filtered.length){const n=idx>0?idx-1:filtered.length-1;selectTweet(filtered[n].id)}break;
    case'n':e.preventDefault();createNewPost();break;
    case'e':e.preventDefault();if(selectedId&&!editMode)startEdit();break;
    case'Escape':if(editMode)cancelEdit();else if(document.getElementById('deleteModal').classList.contains('show'))closeDeleteModal();else if(document.getElementById('importModal').classList.contains('show'))closeImportModal();break;
    case'/':e.preventDefault();document.getElementById('searchInput').focus();break;
    case'Delete':case'Backspace':if(selectedId&&!editMode)openDeleteModal(selectedId);break;
  }
});

// Init
function init(){loadData();renderPage()}
init();

// Generate image for tweet via Gemini 3 Pro
async function generateImageForTweet(tweetText,topic){
  try{
    const resp=await fetch(AB+'/api/generate-image',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text:tweetText,topic:topic})
    });
    const json=await resp.json();
    if(resp.ok){
      showToast('Image generated','success');
      return json.imagePath;
    }else{
      showToast('Image generation failed','error');
      return null;
    }
  }catch(e){
    showToast('Image generation error: '+e.message,'error');
    return null;
  }
}

async function generateImage(id){
  const tw=activeTweets.find(t=>t.id===id);if(!tw)return;
  const btn=document.getElementById('genImgBtn_'+id);
  if(btn){btn.disabled=true;btn.innerHTML='Generating\u2026'}
  const isLinkedin = (tw.platform || 'twitter') === 'linkedin';
  const text = isLinkedin ? (tw.linkedinText || tw.text) : tw.text;
  const topic=(tw.topics&&tw.topics.length)?tw.topics[0]:(tw.linkedinTopic||'bitcoin');
  const imagePath=await generateImageForTweet(text,topic);
  if(imagePath){
    tw.imagePath=imagePath;
    tw.updatedAt=new Date().toISOString();
    saveData();
    renderDetail();
    showToast('Image saved','success');
  }else{
    if(btn){btn.disabled=false;btn.innerHTML=I.image+' Generate Image'}
  }
}

function deleteImage(id){
  const tw=activeTweets.find(t=>t.id===id);if(!tw)return;
  tw.imagePath='';
  tw.updatedAt=new Date().toISOString();
  saveData();
  renderDetail();
  showToast('Image deleted','success');
}

async function regenerateImage(id){
  deleteImage(id);
  setTimeout(()=>generateImage(id),300);
}