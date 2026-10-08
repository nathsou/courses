---
title: The machine
summary: From drums and core planes to page tables, TLBs and the cost of isolation.
number: I
---

The first computers had no memory management at all, because they had almost no memory. A program and its data had to fit in a few thousand words, and the programmer arranged them by hand. When the program did not fit, the programmer cut it into **overlays**: pieces that were loaded from a drum or tape over each other, explicitly, as the program ran. Managing memory meant managing overlays, and it was reported to take a large share of programming effort.

## The one-level store

The Atlas team at Manchester decided the machine should do this instead. Their computer, first running in 1962, had a small, fast memory of magnetic cores and a much larger, slower drum. Rather than make programmers copy between them, the Atlas divided both into 512-word **pages** and kept a register for each page of core recording which page of the program it held. Every address the program generated was compared against those registers in hardware. If the page was in core, the access went ahead. If not, the machine interrupted the program, a supervisor routine fetched the page from the drum, choosing a page of core to send back in exchange, and the program carried on none the wiser. Kilburn and his colleagues called it a **one-level store** :cite[kilburn1962].

Everything in Part I is already there in outline: pages and frames, translation on every access, a fault when a page is missing, a kernel routine to fix it, and the question of which page to throw out. The Atlas even tried to answer that question by learning each page’s pattern of use.

## Getting replacement right

The 1960s turned paging from an experiment into a discipline. At IBM, László Bélády’s 1966 study of replacement algorithms established OPT as the unreachable benchmark and measured how far realistic policies fell short of it :cite[belady1966]. In 1969 he and his colleagues found the anomaly that bears his name :cite[belady1969], and in 1970 Mattson and colleagues explained it by identifying the stack algorithms :cite[mattson1970]. At MIT, the Multics project combined paging with segmentation and used what became known as the Clock algorithm :cite[corbato1968].

Meanwhile time-sharing systems were discovering thrashing the hard way. Peter Denning’s working-set model of 1968 :cite[denning1968] gave the field its central idea: a program needs its working set in memory to make progress, and a system that cannot hold all its programs’ working sets must run fewer programs, not starve all of them. Denning’s 1970 survey, simply titled *Virtual Memory* :cite[denning1970], summed up a decade of argument and was for years the standard reference.

## From mainframes to every machine

Virtual memory spread from mainframes to minicomputers in the 1970s (DEC’s VAX made it standard equipment) and to personal computers once processors had MMUs: the Intel 80386 of 1985 brought two-level page tables to the PC, and the operating systems of the 1990s turned them on for everyone. The idea did not change much. The tables grew more levels as addresses grew wider, from two levels for 32-bit addresses to four, and now five, for 64-bit ones, and the TLB, a small associative memory of recent translations already present in early designs, became essential.

## Caches and the memory wall

While pages moved between core and drum, a second hierarchy was growing inside the processor. Maurice Wilkes described a fast “slave memory” in front of main memory in 1965 :cite[wilkes1965], and IBM’s System/360 Model 85, announced in 1968, was the first commercial machine to have one. As processors sped up much faster than DRAM through the 1980s and 1990s, caches went from a luxury to the main determinant of performance. Wulf and McKee’s 1995 warning about the **memory wall** :cite[wulf1995] was a sign of how far things had gone: the speed of memory, not of arithmetic, now set the pace.

## When the hardware leaks

The 2010s added a sobering chapter. Memory and processors had become so dense and so speculative that the isolation virtual memory promised could be undermined without a single software bug. Rowhammer (2014) flipped bits in DRAM rows nobody had touched :cite[kim2014]; within a year it had been turned into a way to rewrite page tables :cite[seaborn2015]. Meltdown (2018) used speculative execution to read kernel memory that the page tables marked off limits :cite[lipp2018], and the fix, unmapping the kernel from every program’s page tables, reached back into the oldest design choices of virtual memory and made every system call more expensive.

The machine that Part I builds is the machine as designed: pages, tables, a TLB, faults, and policies for eviction. The history above is a reminder that, underneath, it is also a physical device, and that the bytes do not always stay where they were put.

::timeline{part="I"}
