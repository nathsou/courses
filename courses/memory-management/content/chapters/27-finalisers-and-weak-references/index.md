---
title: Finalisers, weak references and ephemerons
summary: Running code when an object dies, and why it is harder than it sounds. Resurrection, soft, weak and phantom references, and ephemerons.
number: 27
duration: 35 minutes
prerequisites: [reachability]
---

Memory is not the only thing an object can hold. A file handle, a network socket, a lock, a texture on the graphics card: when the object that owns one of these dies, someone should give it back. Under ownership (chapter 17) or reference counting (chapter 18), that is easy: the object dies at a known moment, and a destructor can run there. Under a tracing collector, nobody knows when an object dies, not even the collector, until it next looks.

The obvious idea is to let the collector run some code, a **finaliser**, when it finds an object unreachable. The obvious idea turns out to be one of the most troublesome features ever added to a language runtime.

## Back from the dead

::resurrection

A finaliser is ordinary code, so it can do anything, including making its own object reachable again. Java’s specification has to describe objects that are *finalizer-reachable*, reachable only from objects waiting for their finalisers, and it tracks for each object whether its finaliser has been run, so that it runs automatically only once :cite[jls12]. The figure shows what that machinery implies: a finalisable object survives the first collection that finds it unreachable, and so does everything it points to; a resurrected one can live on indefinitely, in a state its class never expected.

Timing is no better. The specification does not say “how soon a finalizer will be invoked” or which thread will run it :cite[jls12]. In 2021, Java’s maintainers proposed removing finalisation from the language altogether, listing its flaws: “an arbitrarily long time may pass between the moment an object becomes unreachable and the moment its finalizer is called”, finalisers can resurrect their objects, and “the mere presence of finalizers imposes a performance penalty” :cite[jep421]. They point programmers instead to the `try`-with-resources statement, which closes a resource at the end of a block, and to *cleaners* :cite[jep421].

## Weak references

A finaliser asks to be told when an object dies. A **weak reference** asks something more modest: a pointer that does not keep its target alive, and that reads as null once the target has been collected. Chapter 19 used weak references to break cycles under reference counting; under a tracing collector they are the standard way to build a cache that does not keep its contents alive.

```mote-task
id: finalisers/weak-cache
title: A cache that lets go
setting: mark-sweep
leaks: true
prompt: |
  The cache remembers the last image it was asked for. Once the program drops its own pointer to the image and a collection runs, the cache should no longer keep the image alive: line 11 should print `still cached false`. Change one thing.
starter: |
  struct Image { id: int, pixels: int }
  struct Cache { last: Image? }

  fn main() {
    let cache = new Cache { last: null }
    var img: Image? = new Image { id: 7, pixels: 4096 }
    cache.last = img
    print("cached", cache.last != null)
    img = null
    gc()
    print("still cached", cache.last != null)
  }
solution: |
  struct Image { id: int, pixels: int }
  struct Cache { weak last: Image? }

  fn main() {
    let cache = new Cache { last: null }
    var img: Image? = new Image { id: 7, pixels: 4096 }
    cache.last = img
    print("cached", cache.last != null)
    img = null
    gc()
    print("still cached", cache.last != null)
  }
expect: ["cached true", "still cached false"]
hints:
  - "A field marked `weak` does not keep its target alive, and is cleared when the target is collected."
explain: "With `weak last`, the collector does not follow the cache’s pointer when it marks. After `img = null`, nothing else reaches the image, so `gc()` frees it and clears the weak field."
```

Java distinguishes three strengths of reference. **Soft** references “are for implementing memory-sensitive caches”: the collector may keep their targets until memory runs short. **Weak** references are “for implementing canonicalizing mappings that do not prevent their keys (or values) from being reclaimed”. **Phantom** references “are for scheduling post-mortem cleanup actions” :cite[java-lang-ref]. JavaScript has `WeakRef`, a weak reference to an object, and `FinalizationRegistry`, which requests a callback when an object has been collected. Both come with the same warning on MDN: “correct use … takes careful thought, and it’s best avoided if possible”, because when, how and whether collection happens is up to each engine :cite[mdn-weakref, mdn-finreg].

## Ephemerons

Weak references have a subtle failure. Suppose a table maps objects to extra information about them, with weak keys so that the table does not keep its keys alive. If an entry’s *value* points back to its key, directly or indirectly, the value keeps the key alive, and the entry is never removed.

Barry Hayes’s **ephemerons**, from 1997, fix this :cite[hayes1997]. An ephemeron is a key–value pair in which the value is reachable only *if the key is reachable from somewhere else*. The collector traces ephemeron values only after it has established that their keys are alive. JavaScript’s `WeakMap` behaves this way: “a key object refers strongly to its contents as long as the key is not garbage collected, but weakly from then on”, so once a key has been collected, its values “become candidates for garbage collection as well — as long as they aren’t strongly referred to elsewhere” :cite[mdn-weakmap].

```quiz
q: "A program keeps a JavaScript WeakMap from DOM elements to objects describing them, and each description object has a field pointing back to its element. The element is removed from the page and the program drops every other reference to it. What happens to the entry?"
options:
  - text: The entry stays for ever, because the description points to the element
    why: "That is what would happen with a plain weak-keyed table. A WeakMap’s entries are ephemerons: the value only counts if the key is alive for some other reason."
  - text: The element and its description can both be collected
    correct: true
    why: "Nothing outside the WeakMap reaches the element, so the key is dead, and the value, reachable only through the entry, goes with it."
  - text: The description is collected but the element stays
    why: "The description is the one that is only reachable through the entry; nothing keeps the element alive either."
```

:::key
A **finaliser** runs code when the collector finds an object unreachable; it can **resurrect** the object, runs at an unpredictable time on an unspecified thread, delays freeing by at least a collection, and is being removed from Java. **Weak references** don’t keep their targets alive (soft ones a little longer, phantom ones only for cleanup). **Ephemerons**, as in JavaScript’s `WeakMap`, keep a value alive only if its key is alive for some other reason.
:::

:::whofrees
The collector, and for other resources, preferably the programmer: an explicit `close`, a `try`-with-resources block, a destructor. Finalisers were an attempt to make the collector free everything; they showed that it should only free memory.
:::

## What’s next

That completes Part VI, and the course’s tour of who frees what. The last chapter goes back to the single allocation of chapter 0, with every layer open at once.
