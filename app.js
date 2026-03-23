// ContentDeck Bitcoin.diy v3.0 — Twitter + LinkedIn Multi-Platform
let activeTweets=[],sentTweets=[],settings={twitter_api:{configured:false,bearer_token:'',consumer_key:'',consumer_secret:'',oauth2_client_id:'',oauth2_client_secret:'',last_tested:null,last_test_result:null}};
let selectedId=null,editMode=false,currentFilter='all',searchQuery='',deleteTargetId=null,currentPage='dashboard';
let currentPlatform='twitter'; // 'twitter' or 'linkedin'
let newTweetIds=new Set(); // tracks IDs seen as "new" since last fetch
let archiveFilter={dateFrom:'',dateTo:'',topic:'',hashtag:''};
const SK='tweetdeck_bitcoindiy_v3',AB='http://localhost:9997';
let lastNotifiedTweets=new Set(),autoRefreshInterval=null;

// LinkedIn topic categories
const LINKEDIN_TOPICS = [
  { value: '', label: 'Select topic...' },
  { value: 'education', label: 'Bitcoin Education' },
  { value: 'reviews', label: 'Product Reviews' },
  { value: 'mining', label: 'Mining Insights' },
  { value: 'security', label: 'Security & Self-Custody' },
  { value: 'market', label: 'Market Analysis' },
  { value: 'technical', label: 'Technical Deep-Dive' },
  { value: 'regulation', label: 'Regulation & Policy' },
  { value: 'adoption', label: 'Adoption & Use Cases' },
  { value: 'lightning', label: 'Lightning Network' },
  { value: 'thought-leadership', label: 'Thought Leadership' }
];

// Suggested hashtags per topic
const LINKEDIN_HASHTAG_SUGGESTIONS = {
  'education': ['Bitcoin', 'CryptoEducation', 'FinancialLiteracy', 'LearnBitcoin', 'Web3'],
  'reviews': ['Bitcoin', 'HardwareWallet', 'CryptoSecurity', 'ProductReview', 'TechReview'],
  'mining': ['Bitcoin', 'BitcoinMining', 'Hashrate', 'ProofOfWork', 'EnergyInnovation'],
  'security': ['Bitcoin', 'CryptoSecurity', 'SelfCustody', 'DigitalSecurity', 'NotYourKeysNotYourCoins'],
  'market': ['Bitcoin', 'CryptoMarket', 'MarketAnalysis', 'InstitutionalAdoption', 'Finance'],
  'technical': ['Bitcoin', 'Blockchain', 'OpenSource', 'Protocol', 'Developer'],
  'regulation': ['Bitcoin', 'CryptoRegulation', 'Policy', 'DigitalAssets', 'Compliance'],
  'adoption': ['Bitcoin', 'Adoption', 'Payments', 'FinancialInclusion', 'GlobalFinance'],
  'lightning': ['Bitcoin', 'LightningNetwork', 'Layer2', 'Payments', 'Scalability'],
  'thought-leadership': ['Bitcoin', 'Leadership', 'FutureOfFinance', 'Innovation', 'DigitalEconomy'],
  '': ['Bitcoin', 'Crypto', 'Finance', 'Technology', 'Innovation']
};

function genId(){return 'tw_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function loadData(){const s=localStorage.getItem(SK);if(s){try{const d=JSON.parse(s);activeTweets=d.active_tweets||[];sentTweets=d.sent_tweets||[];settings=d.settings||settings}catch(e){}}const savedToken=localStorage.getItem('twitter_bearer_token');if(savedToken){settings.twitter_api.bearer_token=savedToken}const savedPlatform=localStorage.getItem('active_platform');if(savedPlatform)currentPlatform=savedPlatform;fetchFile();startAutoRefresh()}
async function fetchFile(){
  try{const r=await fetch('data/tweets.json');if(r.ok){const d=await r.json();const notifyTweets=d.active_tweets.filter(t=>!lastNotifiedTweets.has(t.id)&&t.status==='ready');if(notifyTweets.length>0){notifyTweets.forEach(t=>lastNotifiedTweets.add(t.id));notifyTelegram(notifyTweets)}
  // Track truly new IDs (not seen before in activeTweets)
  const existingIds=new Set(activeTweets.map(t=>t.id));
  d.active_tweets.forEach(t=>{if(!existingIds.has(t.id))newTweetIds.add(t.id)});
  if(d.active_tweets&&d.active_tweets.length>activeTweets.length){activeTweets=d.active_tweets;sentTweets=d.sent_tweets||[];settings=d.settings||settings;saveData();renderPage()}else if(d.active_tweets&&d.active_tweets.length===activeTweets.length){activeTweets=d.active_tweets;renderPage()}}}catch{}
  try{const r=await fetch(AB+'/api/tweets');if(r.ok){const d=await r.json();if(d.active_tweets){const existingIds=new Set(activeTweets.map(t=>t.id));d.active_tweets.forEach(t=>{if(!existingIds.has(t.id))newTweetIds.add(t.id)});activeTweets=d.active_tweets;sentTweets=d.sent_tweets||[];settings=d.settings||settings;saveData();renderPage()}}}catch{}
}
function saveData(){const d={active_tweets:activeTweets,sent_tweets:sentTweets,settings};localStorage.setItem(SK,JSON.stringify(d));localStorage.setItem('twitter_bearer_token',settings.twitter_api.bearer_token);localStorage.setItem('active_platform',currentPlatform);fetch(AB+'/api/tweets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).catch(()=>{})}
const I={bitcoin:'<svg viewBox="0 0 64 64"><path d="M63.04 39.74c-4.27 17.16-21.61 27.58-38.77 23.31C7.12 58.78-3.3 41.44.97 24.28 5.24 7.12 22.58-3.3 39.74.97c17.16 4.27 27.58 21.61 23.3 38.77z" fill="#F7931A"/><path d="M46.11 27.44c.63-4.21-2.58-6.47-6.97-7.98l1.42-5.72-3.48-.87-1.39 5.57c-.91-.23-1.85-.44-2.78-.66l1.4-5.6-3.48-.86-1.43 5.72c-.75-.17-1.49-.34-2.21-.52l0-.02-4.8-1.2-.93 3.72s2.58.59 2.53.63c1.41.35 1.67 1.28 1.62 2.02l-1.63 6.52c.1.02.22.06.36.12-.12-.03-.24-.06-.36-.09l-2.28 9.14c-.17.43-.61 1.07-1.6.83.04.05-2.53-.63-2.53-.63l-1.73 3.98 4.53 1.13c.84.21 1.67.43 2.48.64l-1.44 5.78 3.47.87 1.43-5.73c.95.26 1.87.49 2.77.72l-1.42 5.69 3.48.87 1.44-5.76c5.93 1.12 10.39.67 12.27-4.7 1.52-4.33-.07-6.83-3.2-8.46 2.28-.52 3.99-2.02 4.45-5.12zm-7.95 11.14c-1.08 4.33-8.37 1.99-10.73 1.4l1.91-7.67c2.37.59 9.95 1.76 8.82 6.27zm1.08-11.21c-.98 3.94-7.05 1.94-9.02 1.45l1.74-6.96c1.97.49 8.3 1.41 7.28 5.51z" fill="#FFF"/></svg>',
plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>',
trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
reply:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
retweet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
thread:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"/><circle cx="12" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="2" fill="currentColor" stroke="none"/></svg>',
feather:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg>',
x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
hash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
twitter:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
linkedin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
importArrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
adapt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/><path d="M14 17l3 3 3-3"/></svg>',
alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
// LinkedIn action icons (light theme)
liLike:'<svg viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><path d="M7 22V11l-4 1v10h4zm2-11l4.3-8.3c.5-.9 1.7-1.2 2.5-.5l.2.2c.5.6.7 1.4.5 2.2L15 11h5.5c1.1 0 2 .9 2 2l-1.5 7c-.2.8-.9 1.4-1.8 1.5H9V11z"/></svg>',
liComment:'<svg viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
liRepost:'<svg viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
liSend:'<svg viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
globe:'<svg viewBox="0 0 16 16" fill="#666"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 0112.13-3.25H12.5a4.5 4.5 0 00-9 0H1.5z"/></svg>',
cloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>',
cloudCheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><polyline points="9 15 12 18 15 13"/></svg>'
};
function startAutoRefresh(){if(autoRefreshInterval)clearInterval(autoRefreshInterval);autoRefreshInterval=setInterval(()=>{fetchFile()},30000)}
function notifyTelegram(tweets){console.log('Notification handled by monitor script, not browser')}
async function testTwitterAPI(){try{const r=await fetch('/api/twitter/test');if(r.ok){const data=await r.json();settings.twitter_api.last_tested=new Date().toISOString();settings.twitter_api.last_test_result='success';saveData();showToast('Twitter API Connected');document.getElementById('apiStatus').style.display='flex';return true}else{const error=await r.json();settings.twitter_api.last_test_result=error.message;saveData();showToast('Twitter API Failed: '+error.message);return false}}catch(e){showToast('Connection Error: '+e.message);return false}}

// Platform switching
function switchPlatform(platform) {
  currentPlatform = platform;
  localStorage.setItem('active_platform', platform);
  
  // Update tab UI
  document.querySelectorAll('.platform-tab').forEach(btn => btn.classList.remove('active'));
  const activeTab = document.querySelector(`.platform-tab[data-platform="${platform}"]`);
  if (activeTab) activeTab.classList.add('active');
  
  // Update new post button
  const label = document.getElementById('newPostLabel');
  if (label) label.textContent = platform === 'linkedin' ? 'New Post' : 'New Tweet';
  
  // Reset selection and re-render
  selectedId = null;
  editMode = false;
  renderSidebar();
  renderDetail();
}

// Get char limit for current platform
function getCharLimit(platform) {
  return platform === 'linkedin' ? 3000 : 280;
}

// Get the effective text for a post based on platform
function getPostText(tw) {
  if (tw.platform === 'linkedin') return tw.linkedinText || tw.text;
  return tw.text;
}

// Adapt tweet text to LinkedIn professional format
function adaptTextToLinkedin(tweetText) {
  let adapted = tweetText;
  
  // Expand common abbreviations
  const expansions = {
    'BTC': 'Bitcoin',
    'hodl': 'hold',
    'gm': 'Good morning',
    'gn': 'Good night',
    'fud': 'fear, uncertainty, and doubt',
    'dyor': 'do your own research',
    'NFA': '(not financial advice)',
    'LFG': 'This is exciting',
    'wagmi': "the future looks bright",
    'ngmi': 'falling behind'
  };
  
  Object.entries(expansions).forEach(([short, long]) => {
    adapted = adapted.replace(new RegExp(`\\b${short}\\b`, 'g'), long);
  });
  
  // Add paragraph breaks for readability
  if (adapted.length > 200 && !adapted.includes('\n\n')) {
    const sentences = adapted.split(/(?<=[.!?])\s+/);
    if (sentences.length >= 3) {
      const mid = Math.floor(sentences.length / 2);
      adapted = sentences.slice(0, mid).join(' ') + '\n\n' + sentences.slice(mid).join(' ');
    }
  }
  
  // Add engagement prompt if not already present
  if (!adapted.includes('?') && adapted.length < 2800) {
    adapted += '\n\nWhat are your thoughts on this?';
  }
  
  return adapted;
}

// CONTINUED IN app-render.js
