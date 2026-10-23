"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main" className="narrow page"><section className="panel stack" role="alert"><h1>Something didn’t load.</h1><p>Check your connection and try again.</p><button className="button" onClick={reset}>Try again</button></section></main>; }
