import { useEffect, useMemo, useState } from 'react'
import data from './data/dsaData.json'
import { topics } from './data/topics'

const STORAGE = 'a2z-dsa-tracker-v1'
const LEVELS = ['All', 'Easy', 'Medium', 'Hard']
const REVISIONS = ['All', 'Not Revised', 'Revise Soon', 'Revised']

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g,'')
const topicName = id => topics.find(t => t.id === id)?.name || id

function App(){
 const [items, setItems] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE)) || []

    const progressMap = new Map(
      saved.map(item => [
        item.id,
        {
          solved: item.solved ?? false,
          revision: item.revision ?? 'Not Revised',
          remark: item.remark ?? ''
        }
      ])
    )

    return data.map(item => ({
      ...item,
      ...(progressMap.get(item.id) || {})
    }))
  } catch {
    return data
  }
})
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('All')
  const [revision, setRevision] = useState('All')
  const [status, setStatus] = useState('All')
  const [active, setActive] = useState(null)

  useEffect(() => localStorage.setItem(STORAGE, JSON.stringify(items)), [items])

  const enrichedTopics = useMemo(() => topics.map(t => {
    const topicItems = items.filter(x => x.topic === t.id)
    return {...t, loaded: topicItems.length, solved: topicItems.filter(x=>x.solved).length}
  }), [items])

  const filtered = useMemo(() => items.filter(x => {
    const hay = `${x.title} ${x.subtopic} ${x.topic}`.toLowerCase()
    return (selectedTopic==='all' || x.topic===selectedTopic)
      && (!query || hay.includes(query.toLowerCase()))
      && (level==='All' || x.difficulty===level)
      && (revision==='All' || x.revision===revision)
      && (status==='All' || (status==='Solved' ? x.solved : !x.solved))
  }), [items, selectedTopic, query, level, revision, status])

  const solved = items.filter(x=>x.solved).length
  const pct = items.length ? Math.round(solved/items.length*100) : 0

  function update(id, patch){
    setItems(prev => prev.map(x => x.id===id ? {...x,...patch} : x))
  }
  function openQuestion(item) {
  update(item.id, {
    lastOpened: new Date().toISOString()
  })
  setActive(item)
}

function toggleSolved(item, checked) {
  update(item.id, {
    solved: checked,
    solvedAt: checked
      ? (item.solvedAt || new Date().toISOString())
      : null
  })
}

// Today's progress
const todayKey = new Date().toLocaleDateString("en-CA")

const solvedToday = items.filter(item =>
  item.solvedAt &&
  new Date(item.solvedAt).toLocaleDateString("en-CA") === todayKey
).length
// 🔥 Calculate current streak
function getCurrentStreak() {
  const solvedDates = new Set(
    items
      .filter(item => item.solved && item.solvedAt)
      .map(item =>
        new Date(item.solvedAt).toLocaleDateString("en-CA")
      )
  )

  let streak = 0
  const currentDate = new Date()

  while (true) {
    const dateKey = currentDate.toLocaleDateString("en-CA")

    if (!solvedDates.has(dateKey)) {
      break
    }

    streak++

    currentDate.setDate(currentDate.getDate() - 1)
  }

  return streak
}

const currentStreak = getCurrentStreak()
// Revision counts
const revisionCounts = {
  soon: items.filter(item => item.revision === "Revise Soon").length,
  not: items.filter(item => item.revision === "Not Revised").length,
  revised: items.filter(item => item.revision === "Revised").length
}

// Continue Learning
function continueLearning() {
  const next = items.find(item => !item.solved)

  if (next) {
    openQuestion(next)
  }
}

// Revision Queue
function openRevisionQueue() {
  const next = items.find(
    item => item.revision === "Revise Soon"
  )

  if (next) {
    openQuestion(next)
  }
}

// Random Question
function openRandomQuestion() {
  const unsolved = items.filter(item => !item.solved)

  if (unsolved.length === 0) return

  const random =
    unsolved[Math.floor(Math.random() * unsolved.length)]

  openQuestion(random)
}

  function resetProgress(){
    if(!confirm('Reset all solved, revision and remarks?')) return
    setItems(prev => prev.map(x=>({...x,solved:false,revision:'Not Revised',remark:''})))
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">A2Z</div>
        <div><strong>DSA Tracker</strong><span>Personal Edition</span></div>
      </div>

      <button className={`nav ${selectedTopic==='all'?'active':''}`} onClick={()=>setSelectedTopic('all')}>
        <span>⌂</span> Overview
      </button>

      <div className="side-label">TOPICS</div>
      <div className="topic-list">
        {enrichedTopics.map(t => <button key={t.id}
          className={`topic-btn ${selectedTopic===t.id?'active':''}`}
          onClick={()=>setSelectedTopic(t.id)}>
          <span>{t.name}</span>
          <b>{t.total}</b>
        </button>)}
      </div>

      <div className="sidebar-bottom">
        <button className="reset" onClick={resetProgress}>Reset progress</button>
        <small>Progress is stored locally in this browser.</small>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div>
          <p className="eyebrow">STRIVER'S A2Z</p>
          <h1>{selectedTopic==='all' ? 'DSA Progress Dashboard' : topicName(selectedTopic)}</h1>
          <p className="muted">Your personal problem-solving tracker — no Plus section, no account required.</p>
        </div>
        <div className="overall">
          <div className="ring" style={{'--p':`${pct}%`}}><span>{pct}%</span></div>
          <div><strong>{solved} / {items.length}</strong><small>Solved</small></div>
        </div>
      </header>

      <section className="stats">
        <Stat label="Total Problems" value={items.length}/>
        <Stat label="Solved" value={solved}/>
        <Stat label="Remaining" value={Math.max(items.length-solved,0)}/>
        <Stat label="Hard" value={items.filter(x=>x.difficulty==='Hard').length}/>
      </section>

      <section className="dashboard-grid">

  {/* Today's Progress */}
  <div className="dash-card">

    <div className="dash-card-head">

      <div className="dash-title">
        <span className="dash-icon">✓</span>

        <div>
          <h3>Today's Progress</h3>
          <p>Questions solved today</p>
        </div>
      </div>

      <div className="progress-highlight">

  <strong className="big-number">
    {solvedToday}
  </strong>

  <span className="streak">
    🔥 {currentStreak} Day Streak
  </span>

</div>

    </div>

    <div className="dash-actions">

      <button onClick={continueLearning}>
        Continue Learning
      </button>

      <button onClick={openRandomQuestion}>
        Random Question
      </button>

    </div>

  </div>


  {/* Revision */}
  <div className="dash-card">

    <div className="dash-title">

      <span className="dash-icon">↻</span>

      <div>
        <h3>Revision</h3>
        <p>Your current revision status</p>
      </div>

    </div>


    <div className="revision-row">
      <span>🔴 Revise Soon</span>
      <strong>{revisionCounts.soon}</strong>
    </div>

    <div className="revision-row">
      <span>🟡 Not Revised</span>
      <strong>{revisionCounts.not}</strong>
    </div>

    <div className="revision-row">
      <span>🟢 Revised</span>
      <strong>{revisionCounts.revised}</strong>
    </div>


    <button
      className="wide-action"
      onClick={openRevisionQueue}
    >
      Revision Queue
    </button>

  </div>

</section>

      <section className="topic-progress">

  <div className="section-heading">

    <div>
      <p className="eyebrow">
        YOUR JOURNEY
      </p>

      <h2>
        Topic Progress
      </h2>
    </div>

    <span>
      {solved} solved overall
    </span>

  </div>


  <div className="progress-list">

    {enrichedTopics.map(topic => {

      const topicItems =
        items.filter(item => item.topic === topic.id)

      const topicSolved =
        topicItems.filter(item => item.solved).length

      const width =
        topic.total
          ? Math.min(
              100,
              (topicSolved / topic.total) * 100
            )
          : 0

      return (

        <button
          key={topic.id}
          className="progress-topic"
          onClick={() =>
            setSelectedTopic(topic.id)
          }
        >

          <div className="progress-topic-top">

            <span>
              {topic.name}
            </span>

            <b>
              {topicSolved}/{topic.total}
            </b>

          </div>


          <div className="progress-track">

            <i
              style={{
                width: `${width}%`
              }}
            />

          </div>

        </button>

      )

    })}

  </div>

</section>

      <section className="workspace">
        <div className="toolbar">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search questions..." />
          <select value={level} onChange={e=>setLevel(e.target.value)}>{LEVELS.map(x=><option key={x}>{x}</option>)}</select>
          <select value={revision} onChange={e=>setRevision(e.target.value)}>{REVISIONS.map(x=><option key={x}>{x}</option>)}</select>
          <select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Solved</option><option>Unsolved</option></select>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>✓</th><th>#</th><th>Question</th><th>Level</th><th>Question</th><th>Theory</th><th>Revision</th><th>Remark</th></tr></thead>
            <tbody>
              {filtered.map((x,i)=><tr key={x.id} className={x.solved?'done':''}>
                <td>
  <input
    type="checkbox"
    checked={!!x.solved}
    onChange={e => toggleSolved(x, e.target.checked)}
  />
</td>
                <td>{x.order || i+1}</td>
                <td>
  <button
    className="question"
    onClick={() => openQuestion(x)}
  >
    {x.title}
  </button>
  <small>{x.subtopic}</small>
</td>
                <td><span className={`pill ${slug(x.difficulty)}`}>{x.difficulty}</span></td>
                <td><Links links={x.questionLinks}/></td>
                <td><Links links={x.theoryLinks}/></td>
                <td>
                  <select value={x.revision||'Not Revised'} onChange={e=>update(x.id,{revision:e.target.value})}>
                    {REVISIONS.slice(1).map(r=><option key={r}>{r}</option>)}
                  </select>
                </td>
                <td><input className="remark" value={x.remark||''} onChange={e=>update(x.id,{remark:e.target.value})} placeholder="Add note..."/></td>
              </tr>)}
            </tbody>
          </table>
          {!filtered.length && <div className="empty">No matching problems.</div>}
        </div>
      </section>
    </main>

    {active && <div className="modal-backdrop" onMouseDown={()=>setActive(null)}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <button className="close" onClick={()=>setActive(null)}>×</button>
        <p className="eyebrow">{topicName(active.topic)}</p>
        <h2>{active.title}</h2>
        <div className="modal-meta"><span className={`pill ${slug(active.difficulty)}`}>{active.difficulty}</span><span>{active.subtopic}</span></div>
        <LinkSection title="Question" links={active.questionLinks}/>
        <LinkSection title="Theory" links={active.theoryLinks}/>
        {active.solutionLinks?.length>0 && <LinkSection title="Solution / GitHub" links={active.solutionLinks}/>}
        <label className="modal-label">Revision remark</label>
        <textarea value={active.remark||''} onChange={e=>update(active.id,{remark:e.target.value})} placeholder="What did you learn? What should you revise?"/>
      </div>
    </div>}
  </div>
}

function Stat({label,value}){ return <div className="stat"><small>{label}</small><strong>{value}</strong></div> }

function Links({links=[]}){
  return <div className="links">{(links||[]).slice(0,3).map((l,i)=><a key={i} href={l.url} target="_blank" rel="noreferrer" title={l.url}>{l.platform || 'Open'}</a>)}</div>
}
function LinkSection({title,links}){ return <div className="link-section"><h3>{title}</h3><Links links={links}/></div> }

export default App
