---
title: Reference counting
summary: From Collins’s counts of 1960 to the reference counting inside Python, Swift and Rust, and the tricks that keep it fast.
number: V
---

Reference counting is one of the two oldest answers to the question “when is an object garbage?”; the other, tracing, was published in the same year :cite[mccarthy1960]. In 1960 George Collins described keeping, in each cell of a list structure, a count of the references to it, and erasing the cell when the count fell to zero :cite[collins1960]. The idea is so simple that it keeps being reinvented: in operating systems, where a file’s link count decides when its blocks are freed :cite[posix-unlink]; in component systems, where `Release` frees an object whose count reaches zero :cite[com-release]; and in programming languages from Python to Swift :cite[cpython-refcounting, swift-arc].

## The weaknesses, and the fixes

Its weaknesses were understood almost as early. Counts cannot see cycles, so a ring of objects that point to each other is never freed; languages that rely on counting either ask programmers to break cycles with weak references :cite[swift-arc, python-weakref] or add a cycle collector. The algorithm most of them use, trial deletion, goes back to Martínez, Wachenchauzer and Lins in 1990 :cite[martinez1990] and was made concurrent by Bacon and Rajan in 2001 :cite[bacon2001]; CPython’s collector uses the same subtraction of internal references :cite[cpython-gc].

And counting costs a write on every pointer update. Deutsch and Bobrow’s deferred counting of 1976 stopped counting the stack :cite[deutsch1976]; Levanoni and Petrank coalesced repeated updates to the same field :cite[levanoni2001]; biased counting removed most atomic instructions from multithreaded programs :cite[choi2018], and is how free-threaded CPython keeps its counts :cite[pep703].

## Counting comes back

Two developments have kept counting at the centre of language design. Languages with ownership, C++ and then Rust, adopted counted pointers as the escape hatch for shared data :cite[ms-shared-ptr, rust-rc]. And functional languages discovered that a count of one is a licence to update in place, turning reference counting into an optimisation :cite[reinking2021].

Part V follows the idea from its simplest form (chapter 18) through its blind spot (19) to the techniques that make it fast (20).

::timeline{part="V"}
