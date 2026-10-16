---
title: The problem
summary: 'From the DOM of 1998 to AngularJS in 2010: how a tree of nodes, a stream of events and a lot of hand-written update code made “what changed?” the central question of the front end.'
number: I
---

The Document Object Model arrived as a standard in 1998: a page is a tree of nodes, and a script can create them, move them and change them. At first that was little more than a way to change a picture when the mouse went over it. Then, in 2005, a short essay gave a name to something developers had already been doing, using a background request to fetch data and put it on the page without reloading it. :cite[ajax-garrett] **Ajax** turned pages into applications, and an application has *state* that changes while the page stays where it is.

Every application that changes its own page has to answer one question: **when the data changes, which parts of the page must change with it, and how does the program find them?** The first answer was to write the code by hand. An event handler updates the model, then finds the element and sets its text: `document.getElementById('count').textContent = n`. It is fast, it is as small as it can be, and it breaks as the page grows. Every new place that shows the value is a new line that must be remembered, in every handler that can change it. The page and the model drift apart, and nobody can say which of the two is right.

## Models that tell you

The first systematic fix was the **observer pattern**. :cite[backbone-docs] A model keeps a list of listeners and calls them when it changes; a view subscribes to the models it shows. Backbone.js (2010) made this a framework, and for a few years it was how well-organised single-page applications were written. It worked, and it had its own costs: every view had to remember to unsubscribe, or the model kept it alive and kept calling it (the *zombie views* that Backbone later added `stopListening` to fix); and a change that rippled through several models produced a cascade of events whose order nobody had chosen.

## Looking for changes

The other fix went the opposite way. **AngularJS** (2010) did not ask models to announce anything. It let you assign to plain JavaScript properties and, after every event, it went and looked: for each binding in the page, a *watcher* compared the current value with the last one, and if any differed it updated the DOM and looked again, until a whole pass found nothing new. :cite[angularjs-scope] It is called *dirty checking*, and it is the first of the six answers of this course in which the framework does not know what changed and finds out by asking. Its great virtue was that nothing had to be declared: write ordinary code, and the page follows. Its cost grew with the number of watchers, and with every pass of the loop.

## The browser underneath

All of these ran into the same wall, and it was the browser’s. A write to the DOM is not just a memory write: it can invalidate style, force a new layout and a repaint. Doing a few of them is free and doing thousands in the wrong order is a frozen page. The first part of this course starts there (chapter 1), before it gets to any framework, because the cost of the answers is measured in the browser’s currency.

The prologue (chapter 0) shows the problem in its simplest form, one small page kept up to date in different ways, and the instrument the rest of the course uses to see what each one does to the DOM. The solutions came in waves: a virtual DOM (Part II) in 2013, signals (Part III) rediscovered and refined from 2010 onwards, compilers that decide before the page runs (Part IV), and the server taking work back (Part V).

::timeline{part="I"}
