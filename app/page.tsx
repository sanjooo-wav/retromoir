"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Letter = { id: string; title: string; body: string; month: string; kind: "monthly" | "little"; createdAt: string };
const starterLetters: Letter[] = [];

export default function Home() {
  const [letters, setLetters] = useState(starterLetters);
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Letter["kind"]>("little");
  const [shared, setShared] = useState(true);
  const [notice, setNotice] = useState("");
  const [isAuthor, setIsAuthor] = useState(false);
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  useEffect(() => { fetch("/api/author").then((response) => response.json()).then((data) => setIsAuthor(data.author)).catch(() => setLoginMessage("Author access is unavailable right now.")); fetch("/api/letters").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setLetters(data)).catch(() => setNotice("Letters are not available yet.")); }, []);
  const monthlyLetters = useMemo(() => letters.filter((letter) => letter.kind === "monthly"), [letters]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/author", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json();
    setIsAuthor(data.author);
    setLoginMessage(data.author ? "Author desk unlocked." : data.message);
    if (data.author) setPassword("");
  }

  async function addLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) { setNotice("Write a few words first, then tuck it into the memoir."); return; }
    const response = await fetch("/api/letters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body: note, kind }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.message ?? "Your letter could not be saved."); return; }
    setLetters((current) => [data as Letter, ...current]);
    setTitle(""); setNote(""); setNotice("Letter tucked into her shelf.");
  }

  return <main>
    <nav className="topbar" aria-label="Main navigation"><a className="wordmark" href="#top">ours, in little pieces</a><div className="nav-links"><a href="#letters">letters</a><a href="#anniversary">anniversary reel</a><a className="new-note" href="#author">author desk</a></div></nav>
    <section id="top" className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="kicker">A private place for all the ways I love you</p><h1 id="hero-title">Every month.<br />Every little reason.</h1><p className="intro">A growing memoir made from our letters, photographs, and the tiny things I never want us to lose.</p><a className="paper-button" href="#author">leave her something sweet <span aria-hidden="true">?</span></a></div><div className="hero-memory" aria-label="A favorite memory from the photo album"><div className="tape tape-one" /><Image src="/photos/IMG_3613.webp" alt="A moment from your shared photo album" width={750} height={1000} priority /><p>the kind of day I replay when I need a smile</p><div className="memory-stamp">kept<br />forever</div></div></section>
    <section className="why" aria-label="The promise behind this memoir"><p>Not a feed. Not a highlight reel.</p><p>This is where the in-between lives.</p></section>
    <section className="memory-strip" aria-label="More moments from our album">
      <Image src="/photos/IMG_3530.webp" alt="A memory from our photo album" width={500} height={500} />
      <Image src="/photos/IMG_20260929_081510_326.webp" alt="A memory from our photo album" width={500} height={500} />
      <Image src="/photos/cpm35_2026-07-02_1705392DB1E8DE9CB8.webp" alt="A memory from our photo album" width={500} height={500} />
      <Image src="/photos/cpm35_2026-07-02_1703212A79D365DF21.webp" alt="A memory from our photo album" width={500} height={500} />
    </section>
    <section id="letters" className="letters-section" aria-labelledby="letters-title"><div className="section-heading"><p className="kicker">the letter shelf</p><h2 id="letters-title">Open whenever you need a little more of me.</h2></div><div className="letter-stack">{letters.map((letter, index) => <article className={`letter letter-${(index % 3) + 1}`} key={letter.id}><p className="letter-meta">{letter.kind === "monthly" ? "MONTHSARY LETTER" : "JUST BECAUSE"} · {letter.month}</p><h3>{letter.title}</h3><p>{letter.body}</p><button type="button" onClick={() => setNotice(`“${letter.title}” is ready to read again.`)}>open letter</button></article>)}</div>{notice && <p className="notice" role="status">{notice}</p>}</section>
    <section id="anniversary" className="anniversary" aria-labelledby="anniversary-title"><div className="anniversary-photo"><Image src="/photos/IMG_3531.webp" alt="A second memory from your shared photo album" width={800} height={1000} /></div><div className="anniversary-copy"><p className="kicker">the anniversary reel</p><h2 id="anniversary-title">One year, gathered with both hands.</h2><p>Every monthsary letter is saved here automatically. When the year turns, they become one long love letter, ready to read from the beginning.</p><div className="reel" aria-label={`${monthlyLetters.length} monthsary letters saved`}>{monthlyLetters.map((letter, index) => <span key={letter.id} title={letter.title}>{index + 1}</span>)}{Array.from({ length: Math.max(0, 12 - monthlyLetters.length) }).map((_, index) => <i key={index} />)}</div><p className="reel-label">{monthlyLetters.length ? `${monthlyLetters.length} letters are part of our first chapter.` : "Your first monthsary letter will begin the reel."}</p></div></section>
        <section id="author" className="write-section" aria-labelledby="write-title"><div className="write-intro"><p className="kicker">author&rsquo;s desk</p><h2 id="write-title">{isAuthor ? "Say it before the moment passes." : "A page written only by me."}</h2><p>{isAuthor ? "For monthsaries, big feelings, or the thought that showed up while you were making coffee." : "Her shelf is read-only. The letters are written by one person, for one person."}</p></div>{isAuthor ? <form className="letter-form" onSubmit={addLetter}><label>Type of note<select value={kind} onChange={(event) => setKind(event.target.value as Letter["kind"])}><option value="little">Just because</option><option value="monthly">Monthsary letter</option></select></label><label>Title <span>(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The thing I wanted to tell you" /></label><label>Your letter<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write it exactly how you mean it..." rows={5} /></label><button className="send-button" type="submit">tuck this away <span aria-hidden="true">↗</span></button></form> : <form className="letter-form login-form" onSubmit={signIn}><label>Author password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required /></label><button className="send-button" type="submit">unlock the desk <span aria-hidden="true">↗</span></button>{loginMessage && <p className="notice" role="status">{loginMessage}</p>}</form>}</section><footer><p>made patiently, for the two of you.</p><a href="#top">back to the beginning</a></footer>
  </main>;
}







