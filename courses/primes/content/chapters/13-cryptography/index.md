---
number: 13
title: Primes in cryptography
summary: Public-key cryptography from the number theory of Part II. RSA and why it decrypts correctly, signatures, why textbook RSA is not enough, generating large primes, Diffie–Hellman and discrete logarithms, and what Shor’s algorithm would change.
duration: About 1½ hours
prerequisites: [fermat-euler, probable-primes, factoring]
theorems: [RSA decryption is correct, Knowing d is as hard as factoring, Order finding gives factoring]
techniques: [Euler’s theorem, the Chinese remainder theorem, reductions]
---

Everything so far in Part II comes together here. Primality testing is easy (Chapter 8); factoring seems to be hard (Chapters 11 and 12); exponentiation modulo $n$ is fast (Chapter 5) and can be undone with the right exponent (Chapter 6). That asymmetry is exactly what **public-key cryptography** needs: an operation anyone can perform, which only the holder of a secret can reverse.

## The idea of a public key

For most of history, two people who wanted to communicate secretly had to share a secret key in advance. In 1976 Whitfield Diffie and Martin Hellman published "New Directions in Cryptography", proposing that encryption could use a key that is **public** while decryption uses a different, **private** key, and showing how two strangers can agree on a shared secret over a public channel.:cite[diffie-hellman1976] A year later Ron Rivest, Adi Shamir and Leonard Adleman at MIT found a practical public-key encryption scheme built on factoring. It was described in Martin Gardner's *Scientific American* column in August 1977, together with the challenge number RSA-129 of Chapter 12.:cite[rsa1978]

It later emerged that the same ideas had been found in secret at GCHQ, the British signals intelligence agency: James Ellis proposed "non-secret encryption" in 1970, Clifford Cocks found what is essentially RSA in 1973, and Malcolm Williamson found the Diffie–Hellman exchange around 1974. The work was declassified in 1997.:cite[ellis1997]

## RSA

:::algorithm[RSA key generation, encryption and decryption]
1. Choose two large random primes $p \ne q$ and let $n = pq$.
2. Choose $e$ with $\gcd(e, (p-1)(q-1)) = 1$; in practice $e = 65537 = 2^{16} + 1$.
3. Compute $d = e^{-1} \bmod (p-1)(q-1)$ with the extended Euclidean algorithm.
4. Publish $(n, e)$. Keep $d$ (and $p$, $q$) secret.

To encrypt a message $m$ with $0 \le m < n$: $c = m^e \bmod n$. To decrypt: $m = c^d \bmod n$.
:::

Anyone can encrypt. Decrypting seems to require $d$, and computing $d$ from $e$ requires $(p - 1)(q - 1)$, which seems to require the factors of $n$.

::rsa-playground

:::theorem{name="Correctness of RSA" status=proved}
With $n, e, d$ as above, $(m^e)^d \equiv m \pmod n$ for every integer $m$, including those not coprime to $n$.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
$ed = 1 + k(p-1)(q-1)$. Modulo $p$, Fermat's little theorem turns $m^{k(p-1)(q-1)}$ into $1$ (or $m \equiv 0$ anyway). The same holds modulo $q$, and the Chinese remainder theorem combines the two.
:::
:::level[Proof]
Since $ed \equiv 1 \pmod{(p-1)(q-1)}$, write $ed = 1 + k(p-1)(q-1)$ with $k \ge 0$. We show $m^{ed} \equiv m \pmod p$. If $p \mid m$, both sides are $0$. Otherwise Fermat gives $m^{p-1} \equiv 1$, so
$$m^{ed} = m \cdot \left(m^{p-1}\right)^{k(q-1)} \equiv m \pmod p.$$
The same argument gives $m^{ed} \equiv m \pmod q$. As $p$ and $q$ are distinct primes, $pq$ divides $m^{ed} - m$.
:::
::::

**Signatures** run the same machinery backwards. To sign $m$, the owner of $d$ computes $s = m^d \bmod n$; anyone can check that $s^e \equiv m \pmod n$. Only the holder of $d$ could have produced $s$, as far as anyone knows.

### Decrypting four times faster

The owner of the private key knows $p$ and $q$, so decryption can use the Chinese remainder theorem: compute $m_p = c^{d \bmod (p-1)} \bmod p$ and $m_q = c^{d \bmod (q-1)} \bmod q$ (Fermat lets the exponents be reduced), then combine them. Each exponentiation has half-size numbers and half-size exponents, so with schoolbook multiplication each costs about an eighth of the full one, and there are two: a speed-up of about four. Every RSA implementation does this. The playground above times both; in a browser's big-integer arithmetic the gain is smaller for small keys and approaches four for 2048-bit keys.

```code
id: crypto/rsa-crt
title: RSA decryption with the CRT
prompt: |
  Write `decrypt(c, p, q, d)` returning $m = c^d \bmod pq$, but compute it with the Chinese remainder theorem: $m_p = c^{d \bmod (p-1)} \bmod p$, $m_q = c^{d \bmod (q-1)} \bmod q$, then combine with **Garner's formula** $m = m_q + q \cdot \big((m_p - m_q) \cdot q^{-1} \bmod p\big)$. You may use `modPowBig` and `modInverseBig` from `primes`. Make sure intermediate values modulo $p$ are non-negative.
starter: |
  import { modPowBig, modInverseBig } from 'primes';

  export function decrypt(c: bigint, p: bigint, q: bigint, d: bigint): bigint {
    return modPowBig(c, d, p * q); // correct, but not using the CRT
  }
tests: |
  import { test, expect } from 'test';
  import { decrypt } from 'solution';
  import { modPowBig, modInverseBig, nextPrime } from 'primes';

  function keys(a: bigint, b: bigint) {
    const p = nextPrime(a), q = nextPrime(b);
    const e = 65537n;
    const d = modInverseBig(e, (p - 1n) * (q - 1n))!;
    return { p, q, n: p * q, e, d };
  }
  test('round trips for small keys', () => {
    const k = keys(1000003n, 999999937n);
    for (const m of [0n, 1n, 2n, 42n, 123456789n, k.n - 1n]) expect(decrypt(modPowBig(m, k.e, k.n), k.p, k.q, k.d)).toBe(m);
  });
  test('works when p < q and when p > q', () => {
    const k = keys(10n ** 30n, 10n ** 20n);
    const m = 31415926535897932384626433832795n % k.n;
    expect(decrypt(modPowBig(m, k.e, k.n), k.p, k.q, k.d)).toBe(m);
    expect(decrypt(modPowBig(m, k.e, k.n), k.q, k.p, k.d)).toBe(m);
  });
  test('uses the CRT: half-size exponentiations are much faster on 2048-bit keys', () => {
    const k = keys(2n ** 1023n + 12345n, 2n ** 1023n + 987654321n);
    const m = 2n ** 2000n + 7n;
    const c = modPowBig(m, k.e, k.n);
    let t = performance.now();
    const full = modPowBig(c, k.d, k.n);
    const tFull = performance.now() - t;
    t = performance.now();
    const viaCrt = decrypt(c, k.p, k.q, k.d);
    const tCrt = performance.now() - t;
    expect(viaCrt).toBe(full);
    expect(tCrt).toBeLessThan(tFull * 0.75);
  });
solution: |
  import { modPowBig, modInverseBig } from 'primes';

  export function decrypt(c: bigint, p: bigint, q: bigint, d: bigint): bigint {
    const mp = modPowBig(c, d % (p - 1n), p);
    const mq = modPowBig(c, d % (q - 1n), q);
    const qinv = modInverseBig(q, p)!;
    const h = ((((mp - mq) % p) + p) % p * qinv) % p;
    return mq + h * q;
  }
hints:
  - '`d % (p - 1n)` is the reduced exponent modulo $p$; likewise for $q$.'
  - '`mp - mq` can be negative; normalise with `((x % p) + p) % p` before multiplying by `modInverseBig(q, p)`.'
```

### What RSA's security rests on

If you can factor $n$, you can compute $(p - 1)(q - 1)$ and then $d$: factoring breaks RSA. Is the converse true? Two partial answers are known.

:::theorem{status=sketched}
Anyone who knows $d$ (together with $n$ and $e$) can factor $n$ efficiently, with a randomised algorithm.
:::

*Sketch.* $ed - 1$ is a multiple of $(p - 1)(q - 1)$, so $a^{ed - 1} \equiv 1 \pmod n$ for every unit $a$. Write $ed - 1 = 2^t u$ with $u$ odd and run the sequence $a^u, a^{2u}, \ldots$ exactly as in the Miller–Rabin test (Chapter 8). It ends at $1$; the term before the first $1$ is a square root of $1$, and with probability at least $\frac12$ over the choice of $a$ it is not $\pm 1$, so its gcd with $n$ splits $n$. The probability argument is the same as Case 2 of the proof in Chapter 8. So recovering the private key is exactly as hard as factoring.

But decrypting a particular message without recovering $d$, the **RSA problem**, is not known to be as hard as factoring. In practice, nobody knows a better attack on properly used RSA than factoring $n$, and the number field sieve sets the key sizes: 2048-bit moduli are standard, and 3072 bits are recommended for protection beyond 2030.:cite[nist-keymgmt]

### Textbook RSA is not enough

The scheme above, used directly, has serious weaknesses, which is why it is called "textbook RSA":

- **It is deterministic.** The same message always gives the same ciphertext, so an attacker who can guess the message ("yes" or "no") can check the guess by encrypting it.
- **It is malleable.** $(m_1^e)(m_2^e) = (m_1 m_2)^e$, so an attacker can transform a ciphertext into a related one without decrypting it.
- **Small messages leak.** If $m^e < n$ (a short message with $e = 3$, say), then $c = m^e$ exactly and $m = \sqrt[e]{c}$ over the integers.

Real systems therefore encrypt a randomly padded version of the message, using a scheme such as OAEP (Bellare and Rogaway, 1994), and sign a padded hash of it.:cite[bellare-rogaway-oaep] In practice RSA is mostly used to sign, or to transport a short random key for a fast symmetric cipher.

## Where the primes come from

Key generation needs random primes of 1024 bits or more. The method is simple: pick a random odd number of the right size and test it; if it is composite, try again. How many tries does that take? Chapter 0 said that the density of primes near $N$ is about $1/\log N$; Part V proves it (the prime number theorem). Among odd numbers the density doubles, so you need about $\frac12 \log N$ tries on average: about $355$ for $N \approx 2^{1024}$. Each failure is usually detected by trial division by small primes, or by a single Miller–Rabin round; only the final prime needs the full set of rounds.

::prime-hunt

## Diffie–Hellman and discrete logarithms

Diffie and Hellman's key exchange uses a different hard problem. Fix a large prime $p$ and an element $g$ of large order modulo $p$.

:::algorithm[Diffie–Hellman key exchange]
Alice picks a secret $a$ and sends $A = g^a \bmod p$. Bob picks a secret $b$ and sends $B = g^b \bmod p$. Alice computes $B^a$ and Bob computes $A^b$; both equal $g^{ab} \bmod p$, the shared secret.
:::

::diffie-hellman

An eavesdropper sees $p$, $g$, $g^a$ and $g^b$. Recovering $a$ from $g^a$ is the **discrete logarithm problem** of Chapter 6. Like factoring, it is easy for small numbers and believed to be hard for large, well-chosen ones; the best known methods for prime fields (index calculus and the number field sieve for discrete logarithms) use the same smoothness ideas as the quadratic sieve and have similar subexponential running times. Choosing $p$ well matters: if $p - 1$ has only small prime factors, the Pohlig–Hellman algorithm solves the discrete logarithm one small factor at a time, so in practice $p$ is a **safe prime** $p = 2q + 1$ with $q$ prime, and $g$ generates the subgroup of order $q$, as in the widget.

The same exchange works in any group where exponentiation is easy and discrete logarithms are hard. Most systems today use the group of points on an **elliptic curve** over a finite field (Chapter 32), where no subexponential discrete logarithm algorithm is known, so much shorter keys suffice: a 256-bit curve gives security comparable to 3072-bit RSA.

:::note
**A stopping point.** The last section is about quantum computers; it uses only the Miller–Rabin idea from Chapter 8.
:::

## Shor’s algorithm

In 1994 Peter Shor showed that a quantum computer could factor integers and compute discrete logarithms in polynomial time.:cite[shor1994] The quantum part of his algorithm solves one problem: given $n$ and $a$, find the **order** $r$ of $a$ modulo $n$, the period of the function $k \mapsto a^k \bmod n$. (It does so by preparing a superposition of all $k$ and applying a quantum Fourier transform, which concentrates the amplitudes near multiples of $1/r$.) The rest is classical number theory, and you can do it here.

:::theorem{status=proved}
Let $n$ be odd, $\gcd(a, n) = 1$, and let $r$ be the order of $a$ modulo $n$. If $r$ is even and $a^{r/2} \not\equiv -1 \pmod n$, then $\gcd(a^{r/2} - 1, n)$ is a proper factor of $n$.
:::

:::proof
Let $x = a^{r/2}$. Then $x^2 = a^r \equiv 1$, so $n \mid (x - 1)(x + 1)$. Also $x \not\equiv 1$, since $r/2$ is smaller than the order, and $x \not\equiv -1$ by assumption. So $n$ divides neither $x - 1$ nor $x + 1$, and $\gcd(x - 1, n)$ is neither $1$ (else $n \mid x + 1$, by Euclid's lemma applied prime by prime) nor $n$.
:::

For $n$ odd with at least two distinct prime factors, at least half of the bases $a$ satisfy the hypothesis (a counting argument with the Chinese remainder theorem, which we do not give), so a few random tries suffice.

::shor-classical

Building a quantum computer large enough to run Shor's algorithm on a 2048-bit number would need, by recent estimates, on the order of a million physical qubits with today's error rates, far beyond any existing machine; the largest numbers factored by a genuine run of the algorithm are tiny. But the threat is taken seriously, because encrypted data recorded today could be decrypted later. In August 2024 the US National Institute of Standards and Technology published its first **post-quantum** standards, based on lattice problems and hash functions rather than on factoring or discrete logarithms.:cite[nist-pqc] RSA and elliptic-curve cryptography are expected to be phased out over the next decade or two.

:::key
- RSA: $n = pq$, $ed \equiv 1 \pmod{(p-1)(q-1)}$; $m \mapsto m^e$ encrypts and $c \mapsto c^d$ decrypts, correctly for every $m$ by Fermat and the CRT. Decryption with the CRT is about four times faster.
- Recovering $d$ is as hard as factoring $n$. Textbook RSA is deterministic and malleable; real systems pad randomly.
- Random $k$-bit primes are found by testing random odd numbers; the prime number theorem says about $\frac12 \cdot k \log 2$ tries are needed.
- Diffie–Hellman shares $g^{ab}$ over a public channel; its security rests on discrete logarithms. Safe primes and elliptic curves are the usual groups.
- Shor: a quantum computer finds orders, and an order $r$ with $a^{r/2} \not\equiv -1$ factors $n$ by a gcd.
:::

:::exercises
1. With $p = 61$, $q = 53$ and $e = 17$, compute $d$, encrypt $m = 65$, and decrypt the result. (This is the classic example in many textbooks.)
2. Show that if two RSA moduli share a prime factor, both are broken by one gcd. (In 2012 a survey of public keys on the internet found tens of thousands that did, because of poor random number generation.)
3. Alice sends the same message $m$ with $e = 3$ to three people with coprime moduli $n_1, n_2, n_3$. Show how an eavesdropper recovers $m$ with the Chinese remainder theorem. (This is Håstad's broadcast attack, and a reason for padding.)
4. Show that the order of $2$ modulo $15$ is $4$, and use it to factor $15$ as Shor's algorithm would.
:::
