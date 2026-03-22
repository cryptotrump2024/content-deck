// ContentDeck v3.0 - Rendering Functions (Twitter + LinkedIn)

function fmtD(iso){const d=new Date(iso),n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate()),y=new Date(t);y.setDate(y.getDate()-1);const td=new Date(d.getFullYear(),d.getMonth(),d.getDate());if(td.getTime()===t.getTime())return'Today';if(td.getTime()===y.getTime())return'Yesterday';return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function fmtT(iso){return new Date(iso).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
function fmtDT(iso){const d=new Date(iso);return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
function hl(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/(^|\s)(@\w+)/g,'$1<span class="mention">$2</span>').replace(/(^|\s)(#\w+)/g,'$1<span class="hashtag">$2</span>').replace(/(https?:\/\/[^\s]+)/g,'<span class="url">$1</span>')}
function hlLinkedin(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/(^|\s)(#\w+)/g,'$1<span class="li-hashtag">$2</span>').replace(/(^|\s)(@\w+)/g,'$1<span class="li-mention">$2</span>').replace(/(https?:\/\/[^\s]+)/g,'<a href="#" style="color:#0a66c2;text-decoration:none;font-weight:600">$1</a>')}
function cc(l){return l>280?'danger':l>=260?'warning':''}
function ccol(l){return l>280?'var(--danger)':l>=260?'var(--warning)':l>=200?'var(--btc-orange)':'var(--status-ready)'}
function ccolLinkedin(l){return l>3000?'var(--danger)':l>=2800?'var(--warning)':l>=2000?'var(--btc-orange)':'var(--status-ready)'}

function charColor(l, platform) {
  const limit = getCharLimit(platform);
  const warn = Math.floor(limit * 0.93);
  const mid = Math.floor(limit * 0.7);
  if (l > limit) return 'var(--danger)';
  if (l >= warn) return 'var(--warning)';
  if (l >= mid) return 'var(--btc-orange)';
  return 'var(--status-ready)';
}

function charClass(l, platform) {
  const limit = getCharLimit(platform);
  if (l > limit) return 'danger';
  if (l >= Math.floor(limit * 0.93)) return 'warning';
  return '';
}

function checkDupes(topics,exId){
  if(!topics||!topics.length)return[];
  const ago=new Date();ago.setDate(ago.getDate()-30);const w=[];
  [...activeTweets,...sentTweets].filter(t=>t.id!==exId).forEach(e=>{
    (topics).forEach(tp=>{if((e.topics||[]).includes(tp)&&new Date(e.sentAt||e.createdAt)>=ago&&!w.find(x=>x.topic===tp))w.push({topic:tp,date:new Date(e.sentAt||e.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}),src:e.status==='sent'?'archive':'active'})});
  });return w;
}

function getFiltered(){
  return activeTweets.filter(t=>{
    // Filter by platform
    const tPlatform = t.platform || 'twitter';
    if (tPlatform !== currentPlatform) return false;
    
    if(t.threadId&&t.threadPosition!==0)return false;
    if(currentFilter==='new'){if(!newTweetIds.has(t.id))return false;}
    else if(currentFilter!=='all'&&t.status!==currentFilter)return false;
    if(searchQuery){
      const q=searchQuery.toLowerCase();
      const text = tPlatform === 'linkedin' ? (t.linkedinText || t.text) : t.text;
      return text.toLowerCase().includes(q)||(t.tags||[]).some(x=>x.toLowerCase().includes(q))||(t.hashtags||[]).some(x=>x.toLowerCase().includes(q))||(t.topics||[]).some(x=>x.toLowerCase().includes(q))||(t.linkedinHashtags||[]).some(x=>x.toLowerCase().includes(q))||(t.linkedinTopic||'').toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
}

function getFilteredArch(){
  let f=[...sentTweets];
  if(archiveFilter.topic){const q=archiveFilter.topic.toLowerCase();f=f.filter(t=>(t.topics||[]).some(x=>x.toLowerCase().includes(q)))}
  if(archiveFilter.hashtag){const q=archiveFilter.hashtag.toLowerCase().replace('#','');f=f.filter(t=>(t.hashtags||[]).some(x=>x.toLowerCase().includes(q))||(t.linkedinHashtags||[]).some(x=>x.toLowerCase().includes(q)))}
  if(archiveFilter.dateFrom){const d=new Date(archiveFilter.dateFrom);f=f.filter(t=>new Date(t.sentAt||t.createdAt)>=d)}
  if(archiveFilter.dateTo){const d=new Date(archiveFilter.dateTo);d.setDate(d.getDate()+1);f=f.filter(t=>new Date(t.sentAt||t.createdAt)<d)}
  if(searchQuery){const q=searchQuery.toLowerCase();f=f.filter(t=>{const text=(t.platform==='linkedin'?(t.linkedinText||t.text):t.text);return text.toLowerCase().includes(q)||(t.tags||[]).some(x=>x.toLowerCase().includes(q))||(t.hashtags||[]).some(x=>x.toLowerCase().includes(q))||(t.linkedinHashtags||[]).some(x=>x.toLowerCase().includes(q))||(t.topics||[]).some(x=>x.toLowerCase().includes(q))})}
  return f.sort((a,b)=>new Date(b.sentAt||b.createdAt)-new Date(a.sentAt||a.createdAt));
}
function getThread(tid){return activeTweets.filter(t=>t.threadId===tid).sort((a,b)=>a.threadPosition-b.threadPosition)}

// Navigation
function navigateTo(p){
  currentPage=p;selectedId=null;editMode=false;searchQuery='';
  const si=document.getElementById('searchInput');if(si)si.value='';
  // Sync bottom nav active state
  document.querySelectorAll('.bottom-nav-btn[data-page]').forEach(b=>{
    b.classList.toggle('active',b.dataset.page===p||(p==='dashboard'&&b.dataset.page==='dashboard'));
  });
  renderPage();
}
function renderPage(){
  updateHeader();
  document.getElementById('mainContent').style.display=currentPage==='dashboard'?'flex':'none';
  document.getElementById('archivePage').style.display=currentPage==='archive'?'block':'none';
  document.getElementById('settingsPage').style.display=currentPage==='settings'?'block':'none';
  if(currentPage==='dashboard'){renderSidebar();renderDetail()}
  else if(currentPage==='archive')renderArchive();
  else if(currentPage==='settings')renderSettings();
}
function updateHeader(){
  const s=document.getElementById('apiStatus');if(s)s.style.display=settings.twitter_api.configured?'flex':'none';
  const ac=document.getElementById('archiveCount');if(ac)ac.textContent=sentTweets.length;
  document.querySelectorAll('.nav-link').forEach(el=>el.classList.remove('active'));
  const a=document.querySelector(`.nav-link[data-page="${currentPage}"]`);if(a)a.classList.add('active');

  // Update platform tabs
  document.querySelectorAll('.platform-tab').forEach(btn => btn.classList.remove('active'));
  const pt = document.querySelector(`.platform-tab[data-platform="${currentPlatform}"]`);
  if (pt) pt.classList.add('active');

  // Update new post button label
  const label = document.getElementById('newPostLabel');
  if (label) label.textContent = currentPlatform === 'linkedin' ? 'New Post' : 'New Tweet';
}

// Sidebar
function renderSidebar(){
  const filtered=getFiltered(),list=document.getElementById('tweetList');
  const platformTweets = activeTweets.filter(t => (t.platform || 'twitter') === currentPlatform);
  const ac=platformTweets.filter(t=>!t.threadId||t.threadPosition===0);
  document.getElementById('countNew').textContent=ac.filter(t=>newTweetIds.has(t.id)).length;
  document.getElementById('countAll').textContent=ac.length;
  document.getElementById('countDraft').textContent=ac.filter(t=>t.status==='draft').length;
  document.getElementById('countReady').textContent=ac.filter(t=>t.status==='ready').length;
  document.getElementById('countSent').textContent=ac.filter(t=>t.status==='sent').length;
  const label = currentPlatform === 'linkedin' ? 'post' : 'tweet';
  document.getElementById('tweetCount').textContent=ac.length+' '+label+(ac.length!==1?'s':'');

  if(!filtered.length){
    const emptyMsg = currentPlatform === 'linkedin'
      ? (searchQuery ? 'No matches' : 'No LinkedIn posts yet. Create one or import from Twitter.')
      : (searchQuery ? 'No matches' : 'No tweets yet');
    list.innerHTML=`<div style="padding:40px 20px;text-align:center"><p style="color:var(--text-tertiary);font-size:13px">${emptyMsg}</p></div>`;
    return;
  }

  const groups={};filtered.forEach(t=>{const l=fmtD(t.updatedAt);if(!groups[l])groups[l]=[];groups[l].push(t)});
  let h='';
  const limit = getCharLimit(currentPlatform);

  for(const[label,gts]of Object.entries(groups)){
    h+=`<div class="date-group-label">${label}</div>`;
    gts.forEach(t=>{
      const isT=t.threadId!==null,tc=isT?getThread(t.threadId).length:0;
      const text = getPostText(t);
      const ch=text.length;
      const sel=t.id===selectedId?' selected':'';
      const isLinkedin = (t.platform || 'twitter') === 'linkedin';
      const cardClass = isLinkedin ? ' linkedin-card' : '';

      const ind=[];
      if((t.images||[]).length)ind.push(`<span class="card-indicator card-indicator-img">${I.image} ${t.images.length}</span>`);
      if(isLinkedin && (t.linkedinHashtags||[]).length) ind.push(`<span class="card-indicator" style="color:var(--linkedin-blue)">${I.hash}</span>`);
      else if((t.hashtags||[]).length)ind.push(`<span class="card-indicator card-indicator-hash">${I.hash}</span>`);
      if(t.sourceUrl)ind.push(`<span class="card-indicator card-indicator-link">${I.link}</span>`);
      if(isLinkedin && t.linkedinTopic) ind.push(`<span class="card-indicator" style="color:var(--linkedin-blue)" title="${t.linkedinTopic}">${I.adapt}</span>`);

      const newBadge=newTweetIds.has(t.id)?`<span class="new-badge">New</span>`:'';
      h+=`<div class="tweet-card${sel}${cardClass}" data-id="${t.id}" onclick="selectTweet('${t.id}')">
        <div class="tweet-card-header">
          <div class="tweet-card-meta">
            <span class="status-badge ${t.status}"><span class="status-dot"></span>${t.status[0].toUpperCase()+t.status.slice(1)}</span>
            ${newBadge}
            ${isT?`<span class="thread-indicator">${I.thread} ${tc}</span>`:''}
          </div>
          ${ind.length?`<div class="tweet-card-indicators">${ind.join('')}</div>`:''}
        </div>
        <div class="tweet-card-text">${text.replace(/\n/g,' ')}</div>
        <div class="tweet-card-footer">
          <span class="tweet-card-date">${fmtT(t.updatedAt)}</span>
          <span class="tweet-card-chars ${charClass(ch, t.platform || 'twitter')}">${ch}/${limit}</span>
        </div>
        <div class="tweet-card-actions" onclick="event.stopPropagation()">
          <button class="card-action-btn card-action-archive" onclick="archiveTweet('${t.id}')" title="Archive">${I.archive}</button>
          <button class="card-action-btn card-action-delete" onclick="openDeleteModal('${t.id}')" title="Delete">${I.trash}</button>
        </div>
      </div>`;
    });
  }
  list.innerHTML=h;
}

// Detail Panel
function renderDetail(){
  const p=document.getElementById('detailPanel');
  if(!selectedId){
    const emptyIcon = currentPlatform === 'linkedin' ? I.linkedin : I.feather;
    const emptyTitle = currentPlatform === 'linkedin' ? 'No post selected' : 'No tweet selected';
    const emptyDesc = currentPlatform === 'linkedin'
      ? 'Select a post or create a new one. You can also import from Twitter.'
      : 'Select a tweet or create a new one.';
    const btnLabel = currentPlatform === 'linkedin' ? 'New Post' : 'New Tweet';

    p.innerHTML=`<div class="empty-state">
      <div class="empty-state-icon">${emptyIcon}</div>
      <div class="empty-state-title">${emptyTitle}</div>
      <div class="empty-state-desc">${emptyDesc}</div>
      <button class="btn ${currentPlatform === 'linkedin' ? 'btn-linkedin' : 'btn-primary'}" onclick="createNewPost()" style="margin-top:8px">${I.plus} ${btnLabel}</button>
    </div>`;
    return;
  }
  const tw=activeTweets.find(t=>t.id===selectedId);
  if(!tw){p.innerHTML='';return}

  const isLinkedin = (tw.platform || 'twitter') === 'linkedin';

  if(editMode){
    p.innerHTML = isLinkedin ? renderLinkedinEditor(tw) : renderEditor(tw);
    setTimeout(()=>{
      const ta = document.getElementById(isLinkedin ? 'editLinkedinTextarea' : 'editTextarea');
      if(ta){ta.focus();ta.selectionStart=ta.value.length}
    },50);
    return;
  }

  if (isLinkedin) {
    p.innerHTML = renderLinkedinDetail(tw);
  } else {
    p.innerHTML = tw.threadId ? renderThreadPrev(tw) : renderSinglePrev(tw);
  }
}

// ============ TWITTER PREVIEW RENDERING ============

function tpHTML(tw,cls,pos){
  const imgs=tw.images||[],src=tw.sourceUrl||'';
  let imgH='';
  if(imgs.length){const gc=imgs.length===1?'single':imgs.length===2?'double':imgs.length===3?'triple':'quad';imgH=`<div class="tweet-image-grid ${gc}">${imgs.map((im,i)=>{const du=typeof im==='object'&&im.dataUrl;return du?`<div class="tweet-image-item"><img src="${im.dataUrl}" alt="${im.alt||''}" class="tweet-image-rendered"></div>`:`<div class="tweet-image-item"><div class="tweet-image-placeholder">${I.image}<span>${typeof im==='string'?im:(im.filename||'Image '+(i+1))}</span></div></div>`}).join('')}</div>`}
  let srcH='';if(src){try{var dom=new URL(src).hostname.replace('www.','')}catch(e){dom=src}srcH=`<div class="tweet-source-link"><span class="source-link-icon">${I.link}</span><a href="${src}" target="_blank">${dom}</a></div>`}
  return `<div class="tweet-preview ${cls}"><div class="tweet-header"><div class="tweet-avatar">${I.bitcoin}</div><div class="tweet-name-col"><span class="tweet-display-name">Bitcoin.diy</span><span class="tweet-handle">@bitcoin_diy</span></div>${pos?`<span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-tertiary);font-weight:600">${pos}</span>`:''}</div><div class="tweet-body">${hl(tw.text)}</div>${imgH}${srcH}<div class="tweet-actions-row"><span class="tweet-action-item">${I.reply} 0</span><span class="tweet-action-item">${I.retweet} 0</span><span class="tweet-action-item">${I.heart} 0</span></div></div>`;
}

// ============ LINKEDIN PREVIEW RENDERING ============

function linkedinPreviewHTML(tw) {
  const text = tw.linkedinText || tw.text;
  const hashtags = tw.linkedinHashtags || [];
  const truncated = text.length > 200;
  const displayText = truncated ? text.slice(0, 200) + '...' : text;
  const hashtagStr = hashtags.length ? '\n\n' + hashtags.map(h => '#' + h).join(' ') : '';

  return `<div class="linkedin-preview-container">
    <div class="linkedin-preview-card">
      <div class="linkedin-preview-header">
        <div class="linkedin-avatar">
          <svg viewBox="0 0 64 64" style="width:28px;height:28px"><path d="M46.11 27.44c.63-4.21-2.58-6.47-6.97-7.98l1.42-5.72-3.48-.87-1.39 5.57c-.91-.23-1.85-.44-2.78-.66l1.4-5.6-3.48-.86-1.43 5.72c-.75-.17-1.49-.34-2.21-.52l0-.02-4.8-1.2-.93 3.72s2.58.59 2.53.63c1.41.35 1.67 1.28 1.62 2.02l-1.63 6.52c.1.02.22.06.36.12-.12-.03-.24-.06-.36-.09l-2.28 9.14c-.17.43-.61 1.07-1.6.83.04.05-2.53-.63-2.53-.63l-1.73 3.98 4.53 1.13c.84.21 1.67.43 2.48.64l-1.44 5.78 3.47.87 1.43-5.73c.95.26 1.87.49 2.77.72l-1.42 5.69 3.48.87 1.44-5.76c5.93 1.12 10.39.67 12.27-4.7 1.52-4.33-.07-6.83-3.2-8.46 2.28-.52 3.99-2.02 4.45-5.12zm-7.95 11.14c-1.08 4.33-8.37 1.99-10.73 1.4l1.91-7.67c2.37.59 9.95 1.76 8.82 6.27zm1.08-11.21c-.98 3.94-7.05 1.94-9.02 1.45l1.74-6.96c1.97.49 8.3 1.41 7.28 5.51z" fill="#FFF"/></svg>
        </div>
        <div class="linkedin-name-col">
          <div class="linkedin-display-name">Bitcoin.diy</div>
          <div class="linkedin-headline">Bitcoin Education &amp; Reviews</div>
          <div class="linkedin-post-time">
            Now <span style="margin:0 2px">&middot;</span>
            <svg viewBox="0 0 16 16" fill="#666" style="width:12px;height:12px"><circle cx="8" cy="8" r="7" fill="none" stroke="#666" stroke-width="1.2"/><path d="M8 3v5l3 3" fill="none" stroke="#666" stroke-width="1.2" stroke-linecap="round"/></svg>
          </div>
        </div>
      </div>
      <div class="linkedin-preview-body">${hlLinkedin(text + hashtagStr)}</div>
      <div class="linkedin-preview-engagement">
        <div class="linkedin-reaction-icons">
          <span class="linkedin-reaction-icon like" style="font-size:10px;color:white">&#128077;</span>
          <span class="linkedin-reaction-icon celebrate" style="font-size:10px;color:white">&#128079;</span>
        </div>
        <span>12</span>
        <span style="margin-left:auto">2 comments</span>
      </div>
      <div class="linkedin-preview-divider"></div>
      <div class="linkedin-preview-actions">
        <button class="linkedin-action-btn">${I.liLike} <span>Like</span></button>
        <button class="linkedin-action-btn">${I.liComment} <span>Comment</span></button>
        <button class="linkedin-action-btn">${I.liRepost} <span>Repost</span></button>
        <button class="linkedin-action-btn">${I.liSend} <span>Send</span></button>
      </div>
    </div>
  </div>`;
}

// ============ LINKEDIN DETAIL VIEW ============

function renderLinkedinDetail(tw) {
  const text = tw.linkedinText || tw.text;
  const c = text.length;
  const limit = 3000;
  const pct = Math.min((c / limit) * 100, 100);
  const topic = tw.linkedinTopic || '';
  const hashtags = tw.linkedinHashtags || [];
  const topicLabel = LINKEDIN_TOPICS.find(t => t.value === topic);

  return `<div class="detail-view animate-in">
    <div class="detail-toolbar">
      <div class="detail-toolbar-left">
        <span class="status-badge ${tw.status}"><span class="status-dot"></span>${tw.status[0].toUpperCase()+tw.status.slice(1)}</span>
        <span class="platform-badge linkedin">${I.linkedin} LinkedIn</span>
        ${topic ? `<span class="linkedin-topic-badge">${topicLabel ? topicLabel.label : topic}</span>` : ''}
      </div>
      <div class="detail-toolbar-right">
        ${linkedinStatusBtns(tw)}
        <button class="btn btn-secondary" onclick="startEdit()">${I.edit} Edit</button>
        <button class="btn btn-danger" onclick="openDeleteModal('${tw.id}')">${I.trash}</button>
      </div>
    </div>
    <div class="detail-body">
      ${linkedinPreviewHTML(tw)}

      <div class="char-bar-container">
        <div class="char-bar-track">
          <div class="char-bar-fill" style="width:${pct}%;background:${charColor(c, 'linkedin')}"></div>
        </div>
        <div class="char-bar-labels">
          <span class="char-bar-count" style="color:${charColor(c, 'linkedin')}">${c} characters</span>
          <span class="char-bar-limit">${limit} limit</span>
        </div>
      </div>

      <div class="detail-meta">
        <div class="meta-item">
          <span class="meta-label">Created</span>
          <span class="meta-value">${fmtDT(tw.createdAt)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Updated</span>
          <span class="meta-value">${fmtDT(tw.updatedAt)}</span>
        </div>
        ${tw.sentAt ? `<div class="meta-item"><span class="meta-label">Sent</span><span class="meta-value">${fmtDT(tw.sentAt)}</span></div>` : ''}
        ${topic ? `<div class="meta-item"><span class="meta-label">Topic</span><span class="meta-value">${topicLabel ? topicLabel.label : topic}</span></div>` : ''}
      </div>

      ${hashtags.length ? `<div class="detail-section"><div class="detail-section-label">${I.hash} Hashtags</div><div class="hashtags-display">${hashtags.map(h => `<span class="hashtag-chip linkedin">#${h}</span>`).join('')}</div></div>` : ''}

      ${(tw.topics||[]).length ? `<div class="tags-row" style="margin-top:4px">${tw.topics.map(t=>`<span class="tag" style="border-color:rgba(10,102,194,0.3);color:var(--linkedin-blue)">${t}</span>`).join('')}</div>` : ''}
      ${tw.tags && tw.tags.length ? `<div class="tags-row">${tw.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>` : ''}
      ${tw.notes ? `<div class="notes-block"><div class="notes-label">Notes</div><div class="notes-text">${tw.notes}</div></div>` : ''}

      ${renderImageSection(tw)}

      <div class="action-bar">
        <button class="btn btn-copy" onclick="copyLinkedinText('${tw.id}')" id="copyBtn">${I.copy} Copy Text</button>
      </div>
    </div>
  </div>`;
}

function linkedinStatusBtns(tw) {
  let h = '';
  if (tw.status === 'draft') {
    h += `<button class="btn btn-status to-ready" onclick="changeStatus('${tw.id}','ready')">Mark Ready</button>`;
  } else if (tw.status === 'ready') {
    h += `<button class="btn btn-status to-draft" onclick="changeStatus('${tw.id}','draft')">Back to Draft</button>`;
    h += `<button class="btn btn-status to-sent" onclick="archiveTweet('${tw.id}')"><span style="display:inline-flex;align-items:center;gap:4px">${I.archive} Archive</span></button>`;
  } else if (tw.status === 'sent') {
    h += `<button class="btn btn-status to-draft" onclick="changeStatus('${tw.id}','draft')">Back to Draft</button>`;
  }
  return h;
}

// ============ TWITTER DETAIL VIEWS (unchanged logic) ============

function stBtns(tw){
  let h='';const apiOk=settings.twitter_api.configured;
  if(tw.status==='draft'){h+=`<button class="btn btn-status to-ready" onclick="changeStatus('${tw.id}','ready')">Mark Ready</button>`}
  else if(tw.status==='ready'){
    h+=`<button class="btn btn-status to-draft" onclick="changeStatus('${tw.id}','draft')">Back to Draft</button>`;
    h+=`<button class="btn btn-status to-sent" onclick="archiveTweet('${tw.id}')"><span style="display:inline-flex;align-items:center;gap:4px">${I.archive} Archive</span></button>`;
    h+=`<button class="btn btn-twitter${apiOk?'':' disabled'}" onclick="${apiOk?`sendToTwitter('${tw.id}')`:'showToast(\'Configure Twitter API in Settings\',\'error\')'}" title="${apiOk?'Post to Twitter/X':'Configure Twitter API in Settings'}">${I.twitter} Send to Twitter</button>`;
  }else if(tw.status==='sent'){h+=`<button class="btn btn-status to-draft" onclick="changeStatus('${tw.id}','draft')">Back to Draft</button>`}
  return h;
}

// Shared image section for both Twitter and LinkedIn detail views
function renderImageSection(tw) {
  const hasImage=tw.imagePath&&tw.imagePath.trim()!=='';
  const isLinkedin = (tw.platform || 'twitter') === 'linkedin';
  const btnClass = isLinkedin ? 'btn-linkedin' : 'btn-primary';
  if(hasImage){
    return `<div class="image-section"><div class="image-section-title">Generated Image</div><div class="image-preview"><img src="${tw.imagePath}" alt="Generated image" style="max-width:100%;border-radius:6px;border:1px solid var(--border-medium)"><div class="image-actions"><button class="btn btn-secondary" onclick="deleteImage('${tw.id}')" style="font-size:12px;padding:4px 8px">Delete</button><button class="btn btn-secondary" onclick="regenerateImage('${tw.id}')" style="font-size:12px;padding:4px 8px">Regenerate</button></div></div></div>`;
  }else{
    return `<div class="image-section"><div class="image-section-title">Image</div><div class="image-placeholder"><div style="color:var(--text-tertiary);font-size:13px;margin-bottom:8px">No image yet</div><button class="btn ${btnClass}" id="genImgBtn_${tw.id}" onclick="generateImage('${tw.id}')" style="font-size:12px;padding:5px 12px;min-width:0">${I.image} Generate</button></div></div>`;
  }
}

function renderSinglePrev(tw){
  const c=tw.text.length,pct=Math.min((c/280)*100,100);
  const dupes=checkDupes(tw.topics||[],tw.id);
  let dupeH='';if(dupes.length)dupeH=`<div class="dupe-warning"><div class="dupe-warning-icon">${I.alert}</div><div><strong>Topic overlap detected:</strong><ul style="margin:4px 0 0 16px;font-size:12px">${dupes.map(d=>`<li>"${d.topic}" covered ${d.date} (${d.src})</li>`).join('')}</ul></div></div>`;

  const imgH = renderImageSection(tw);

  return `<div class="detail-view animate-in"><div class="detail-toolbar"><div class="detail-toolbar-left"><span class="status-badge ${tw.status}"><span class="status-dot"></span>${tw.status[0].toUpperCase()+tw.status.slice(1)}</span><span class="platform-badge twitter">${I.twitter} Twitter</span></div><div class="detail-toolbar-right">${stBtns(tw)}<button class="btn btn-secondary" onclick="startEdit()">${I.edit} Edit</button><button class="btn btn-danger" onclick="openDeleteModal('${tw.id}')">${I.trash}</button></div></div><div class="detail-body">${dupeH}<div class="tweet-preview-container">${tpHTML(tw,'','')}</div>${imgH}<div class="char-bar-container"><div class="char-bar-track"><div class="char-bar-fill" style="width:${pct}%;background:${ccol(c)}"></div></div><div class="char-bar-labels"><span class="char-bar-count" style="color:${ccol(c)}">${c} characters</span><span class="char-bar-limit">280 limit</span></div></div><div class="detail-meta"><div class="meta-item"><span class="meta-label">Created</span><span class="meta-value">${fmtDT(tw.createdAt)}</span></div><div class="meta-item"><span class="meta-label">Updated</span><span class="meta-value">${fmtDT(tw.updatedAt)}</span></div>${tw.sentAt?`<div class="meta-item"><span class="meta-label">Sent</span><span class="meta-value">${fmtDT(tw.sentAt)}</span></div>`:''}${tw.plannedDate?`<div class="meta-item"><span class="meta-label">Planned</span><span class="meta-value">${fmtDT(tw.plannedDate)}</span></div>`:''}</div>${(tw.topics||[]).length?`<div class="tags-row" style="margin-top:4px">${tw.topics.map(t=>`<span class="tag" style="border-color:rgba(29,155,240,0.3);color:var(--twitter-blue)">${t}</span>`).join('')}</div>`:''}${tw.tags.length?`<div class="tags-row">${tw.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>`:''}${tw.notes?`<div class="notes-block"><div class="notes-label">Notes</div><div class="notes-text">${tw.notes}</div></div>`:''}<div class="action-bar"><button class="btn btn-copy" onclick="copyText('${tw.id}')" id="copyBtn">${I.copy} Copy Text</button></div></div></div>`;
}

function renderThreadPrev(tw){
  const tts=getThread(tw.threadId),status=tw.status;
  let pH='';tts.forEach((t,i)=>{let cls='';if(tts.length>1){if(i===0)cls='thread-first';else if(i===tts.length-1)cls='thread-last';else cls='thread-mid'}pH+=tpHTML(t,cls,`${i+1}/${tts.length}`);if(i<tts.length-1)pH+='<div class="thread-connector-line"></div>'});
  return `<div class="detail-view animate-in"><div class="detail-toolbar"><div class="detail-toolbar-left"><span class="status-badge ${status}"><span class="status-dot"></span>${status[0].toUpperCase()+status.slice(1)}</span><span class="thread-label">${I.thread} Thread &middot; ${tts.length} tweets</span></div><div class="detail-toolbar-right">${stBtns(tw)}<button class="btn btn-secondary" onclick="startThreadEdit('${tw.threadId}')">${I.edit} Edit Thread</button><button class="btn btn-danger" onclick="openDeleteModal('${tw.id}')">${I.trash}</button></div></div><div class="detail-body"><div class="tweet-preview-container">${pH}</div><div class="detail-meta"><div class="meta-item"><span class="meta-label">Total Chars</span><span class="meta-value" style="font-family:'JetBrains Mono',monospace">${tts.reduce((s,t)=>s+t.text.length,0)}</span></div><div class="meta-item"><span class="meta-label">Tweets</span><span class="meta-value" style="font-family:'JetBrains Mono',monospace">${tts.length}</span></div></div><div class="action-bar"><button class="btn btn-copy" onclick="copyThread('${tw.threadId}')" id="copyBtn">${I.copy} Copy All</button></div></div></div>`;
}