---
number: VII
title: 'How we got here: injection and taint'
summary: The vulnerabilities came before the analyses. Perl's taint mode, SQL injection described in a hacker magazine, cross-site scripting named at the turn of the century, and the taint analyses that followed, for web applications and phones.
duration: About 10 minutes
---

Part VII is about the vulnerabilities that taint analysis looks for, and the analysis itself. The vulnerabilities were found in practice first, often by attackers, and the analyses followed.

## Taint as a language feature

The idea of marking data from outside the program as untrusted is older than the web. **Perl** has a taint mode, enabled with `-T`, in which data from the environment, the command line and files is tainted, propagates through expressions, and makes the program die if it reaches a system call or a file operation without being *laundered* through a regular-expression match. It was designed for scripts running with elevated privileges, and it is the direct ancestor of the sources, sinks and sanitizers of chapter 29. Ruby had a similar mechanism for many years.

## The web arrives

In 1998, an article in the hacker magazine *Phrack* described how to make a Microsoft web server's database run commands of the attacker's choosing by inserting SQL into a request parameter. :cite[rfp1998] It is usually cited as the first public description of **SQL injection**. The attack needed no special tools and worked against any application that built queries by concatenation, which was most of them.

Around 2000, the same pattern in HTML, input echoed into a page where it could run script in other users' browsers, received the name **cross-site scripting**. The Open Web Application Security Project, founded in 2001, published its first Top 10 list of web application risks in 2003; injection has been on every edition since. :cite[owasp2021]

## Analyses for web applications

Academic taint analyses for web applications appeared in the mid-2000s. Benjamin Livshits and Monica Lam found SQL injection and cross-site scripting vulnerabilities in Java web applications in 2005 with a points-to-based analysis written in a Datalog-like language, :cite[livshits2005] and the Pixy tool did the same for PHP in 2006. :cite[jovanovic2006] The vocabulary of this course, sources, sinks, sanitizers, comes from this line of work, along with its central difficulty: the analysis is only as good as its models of the frameworks and libraries that applications are built on.

## Phones and beyond

Smartphones brought a new version of the problem: apps that leak private data (location, contacts, device identifiers) to the network. **FlowDroid**, published in 2014, applied IFDS-based taint analysis to Android apps, with access paths for objects and a model of the Android lifecycle. :cite[arzt2014] Its precision on benchmarks of known leaks, and its open-source availability, made it the reference point for a decade of research.

Taint analysis is now a standard part of commercial analysers and of security tools such as CodeQL. The rules are configurations of a shared engine, as in chapter 29: a source, a sink, a sanitizer, and models of everything in between.

## Implicit flows

The theory of information flow is older still. Dorothy Denning's lattice model of 1976 and the certification of programs with Peter Denning in 1977 described explicit and implicit flows and the program counter's label. :cite[denning1976,denning1977] Joseph Goguen and José Meseguer defined **noninterference** in 1982, :cite[goguen1982] and security type systems with soundness proofs followed from 1996. :cite[volpano1996] Chapter 30 is about why most taint analysers, unlike these systems, choose to look only at explicit flows.

::timeline{part="VII"}
