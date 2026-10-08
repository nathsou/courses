---
title: When manual management goes wrong
summary: Thirty years of memory errors, the tools that hunt them, and the languages that rule them out.
number: IV
---

Manual memory management is older than its failures were famous. For decades a use after free or an overflowing buffer was a bug like any other: the program crashed, or printed the wrong answer, and someone found the line and fixed it. What changed was the network. Once programs read input from strangers, a memory error stopped being a crash and became a way in.

## The bugs become weapons

The Morris worm of 1988 used a stack buffer overflow in `fingerd` to spread :cite[spafford1989]; by 1996 the technique was a tutorial :cite[aleph1996]. Heap errors followed the same path. When zlib’s maintainers announced in 2002 that a crafted stream could make the library free the same memory twice, they admitted that earlier reports had been taken lightly, until people pointed out that “double-frees had been exploited in the past” :cite[zlib2002]. Heartbleed, in 2014, needed no exploit at all: a missing length check let anyone read a server’s memory, private keys included, 64 kilobytes at a time :cite[openssl2014, codenomicon2014]. And browsers, which run code from every website they visit, became the main battlefield for use-after-free bugs :cite[chromium-memory-safety].

## Tools that hunt

The detectors grew up alongside. Electric Fence, in use at Pixar since 1987, borrowed the MMU to fault on the first byte past a block :cite[efence]. Purify, in 1992, inserted checks into compiled programs to catch memory leaks and access errors :cite[hastings1992]. Valgrind’s Memcheck did the same without recompiling, at a cost of twenty or thirty times the running time :cite[valgrind-quickstart], and AddressSanitizer, in 2012, made shadow memory cheap enough to run on every test :cite[serebryany2012]. Allocators hardened themselves too: glibc now refuses obvious double frees and hides its free-list pointers :cite[glibc-malloc-c]. The hardware is joining in, with memory tags and capabilities :cite[linux-mte, watson2019].

## Languages that rule them out

The other line of attack was to change the language. C++ tied freeing to scopes with destructors :cite[stroustrup-faq]. Research languages went further: Tofte and Talpin’s regions :cite[tofte1997] and Cyclone’s checked regions for C :cite[grossman2002]. Rust took ownership and borrowing into a mainstream systems language, with its 1.0 release in 2015 :cite[rust2015].

By the late 2010s the numbers were impossible to ignore: about 70% of the vulnerabilities Microsoft fixed, and of Chromium’s serious security bugs, were memory-safety problems :cite[msrc2019, chromium-memory-safety]. The response reached government. In 2024 the White House’s Office of the National Cyber Director published a report calling for a move to memory-safe programming languages :cite[oncd2024], and Google reported that Android’s share of memory-safety vulnerabilities had fallen from 76% to 24% in six years as new code moved to memory-safe languages :cite[vanderstoep2024].

Part IV follows that story in three steps: the errors themselves (chapter 15), the tools that catch them (16), and ownership, the discipline that removes them (17).

::timeline{part="IV"}
