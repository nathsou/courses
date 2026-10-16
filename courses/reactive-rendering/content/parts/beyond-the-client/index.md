---
title: Beyond the client
summary: 'From swapping HTML in 2011 to server components and resumability: how the server took back some of the work, and what that did to the question.'
number: V
---

For fifteen years the story of front-end frameworks was about what happens *in the browser*. In the last decade a second story has run alongside it, and increasingly through it: which of the work should *not* happen in the browser at all?

## HTML over the wire, again

The oldest answer is the one the web started with. A server sends HTML, and the browser shows it. Before Ajax, replacing the whole page on every click was the only way. In 2011 GitHub’s pjax kept the speed of Ajax while sending HTML: a click fetched the next page’s HTML from the server and swapped it into the current page. Turbolinks followed in 2012. The swap was the problem: replacing a node destroys what the page owns (typed text, focus, scroll position), and it was **morphdom** (2015) and later **Idiomorph** that solved it, by turning one tree into another with the fewest changes. :cite[morphdom] :cite[idiomorph] Turbo 8 (2024), htmx and Phoenix LiveView all use morphing: an application that runs on the server, with a thin renderer in the browser. :cite[turbo-morphing]

## Server rendering and its bill

Meanwhile single-page applications had a problem of their own: a blank page until the JavaScript arrived. Next.js (2016) made **server rendering** with takeover on the client a default: the server runs the components to produce HTML, and the browser downloads the application and *hydrates* it. :cite[react-hydration] The first paint became fast. And the page became *visible but dead* for the time hydration took, because hydration is the whole application running again in the browser.

## Not running it again

The rest of the part is about not paying that bill in full. **Islands** (described by Jason Miller in 2020) hydrate only the interactive parts of a mostly static page. :cite[miller-islands] **Server components** (the React RFC of December 2020) keep some components on the server for good, so that their code never ships. :cite[rsc-rfc] **Resumability** (Qwik, from 2021) writes the state, the handler references and the subscriptions into the HTML, so that the browser can continue where the server stopped, without running the application at load. :cite[qwik-resumable] Each moves the line between work done once, on the server, and work the browser has to do, and each asks something of the programmer in return: a boundary to design, serializable props, serializable closures.

## What stays the same

None of this changes the question. Someone still has to find out what changed (the server components’ payloads, the morph’s diff, the resumable page’s subscriptions) and the six answers of chapter 0 reappear in new places: *rebuild* in the server-rendered page, *diff* in the morph, *track* in the resumable subscription, *skip* everywhere. The final chapters of the course put them all in one benchmark, and then in a decision.

::timeline{part="V"}
