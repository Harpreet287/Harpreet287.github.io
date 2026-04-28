---
title: "Systems and Network Security"
date: "2026-04-28"
tags: ["Cryptography", "Course-Work", "IIITH"]
hidden: false
description: "End Semester marathon for SNS."
---

## Introduction

Explanation of topics covered by Prof. Ashok Kumar Das in course Systems and Network Security at IIITH.

## IPSec

Security at network layer.

IPSec $\implies$ something that applies to IP layer. It acts on two layers, between Transport and Network Layer or after Network Layer. It's function is to provide security to each network packet. A packet in IPV4 is also called a $\textit{datagram}$.

### Transport Mode

In Transport Mode, IPSec protects packets delivered from Transport Layer to Network Layer.
Packet has only payload in the begining.

![IPSec transport](/assets/images/sns/ipsec-transport.png)

### Tunnel Mode

In Tunnel Mode, IPSec protects packets after Network layer and hence a new network layer is formed.
![IPSec tunnel](/assets/images/sns/ipsec-tunnel.png)

We have two protocols for IPSec. Note that AH doesn't apply IPSec Tail, it only applies IPSec Head.

### Authentication Header

As name suggests, it only applies IPSec header to the payload. It is composed of:

1. Next Header: Type of payload i.e. TCP, UDP or ICMP. It's size is 8 bits.
2. Sequence Number: Ordering index of datagrams. It's size is 32 bits.
3. Payload Length: Size is 8 bits.
4. Security Parameter Index: Which algorithm or key should I use. It's size is 32 bits.
5. Authentication Data: 32 bit output which is result of applying hash function to all IP datagram except TTL or time dependent entries.

### Encapsulating Security Protocol

It encapsulates the entire packet i.e. applies both IPSec header and IPSec tail to the payload.

1. Next Header: Type of payload i.e. TCP, UDP or ICMP.
2. Padding: 0-255 bytes that can be padded with the datagram.
3. Pad Length: 8 bit value, length of padding.
4. Security Parameter Index: similar to Authentication Header.
5. Sequence Number: similar to Authentication Header.
6. Authentication Data: First encrypt payload and trail. Then use with ESP header to generate authentication data.

Note that IP header is not included in caculation of authentication data of ESP, whereas in AH it is(entire packet is.)

Why do we still need AH?

AH authenticates entire packet(including IP Header), not just payload. High performance on low power devices. In some cases encryption might not be legal, AH is used for authentication in those settings(notice encrypt payload and esp trail to get authentication data.)

### Services provided by IPSec

1. Confidentiality, Only ESP.
2. Message Authentication.
3. Entity(Sender) Authentication.
4. Access Control i.e discard random packets.

### Algorithms to prevent Replay Attack

Replay Attack is when attacker intercepts the credentials and use it later at the destination again. Assume your window size is $W$ and left end of window is at $N$. Incoming packet has sequence number $i$.

#### Naive(Sliding) Algorithm

**Case 1**: If $i<N$, discard the packet as window has moved on.
**Case 2**: If $N \geq i \geq N+W-1$, take the packet.
**Case 3**: If $i \geq N+W$ move the window to the right to cover the packet.

#### Wu-Zhao's Improvement

**Lemma 1**: If packet $i$ arrived and we already have a packet $j$, it gets dropped.
**Lemma 2**: If packet $i$ has arrived and we have atleast $W$ packets ahead of it, packet gets dropped.

#### Receiving Window Protocol

``` md
1. Note each packet's sequence number.
2. If incoming packet's sequence number < lowest sequence number: drop
3. If incoming packet's stored already: drop
4. Create new subwindow(aka write in memory) s.
5. If total subwindows > W: remove smallest subwindow and upadte lowest sequence number 
```

Worst case space complexity is $N \times w$ bits where N is bit size of sequence number and total w packets.

#### Range Window Protocol

```md
1. Instead of storing each packet in memory, aggregate smaller subwindows.
2. store [lowest seq number, highest seq number] per subwindow.
```

Worst case space complexity is $2 \times N \times w$ bits where N is bit size of sequence number and total w packets.

#### Hybrid Receiving Window

IPSec Sliding window + Receiving Window

```md
0. In addition to regular IPSec sliding window.
1. For out of order packets, maintain another receiving window protocol.
```

Worst case complexity is adaptive.

#### Hybrid Range Window

IPSec sliding window + Range window

```md
0. In addition to regular IPSec Sliding window.
1. For out of order packets, run Range Window Protocol.
```

Worst case complexity is adaptive.

## PGP

Security at Application Layer.

While IPSec was used to provides security at transport layer and network layer, products like PGP, kerberos, S/MIME provide security at application layer.

PGP provides security(authentication and confidentiality) to emails, file storage systems. It makes use of RSA, Diffie-Hellman for public key; Digital Signature Standard(DSS), RSA Signature for signature scheme; SHA-1 for hashing and 3DES, IDEA, CAST-128 for symmetric key encryption.

Compression is done with help of ZIP as message maybe compressed to store and transmit.

Email compatibility is achieved via Radix-64 conversion i.e. ncrypted message is converted to ASCII using Radix 64 conersion.

It supports five functionalities:

1. Authentication.
2. Confidentiality.
3. Compression.
4. Segmentation.
5. Email Compatibility.

### Radix-64 Encoding

To encode means to compress information. Radix-64(or base-64) encoding is a way to encode 6 bit numbers to a value from either A-Z, a-z, 0-9, +, / or = for padding.

We do the following:

a. If input string is ASCII, we convert each character of ASCII to 8 bit numbers. Why 8? Note total entries in ASCII is 256, hence each entry can be written in binary of 8 bits or 1 byte.

b. Club each 6 bit chunk together. Pad the ending with 0s.

c. For each 6 bit chunk, encode using Radix-64 table.

**Example**

Encode `An-9` to radix-64.

a. `A` = `01000001`, `n` = `01101110`, `-` = `00101101`, `9` = `00111001`.

b. 6 bit chunks are `010000`, `010110`, `111000`, `101101`, `001110`, `010000`(notice the padding).

c. `010000` = Q, `010110` = W, `111000` = 4, `101101` = t, `001110` = O, `010000` = Q

Final answer is `QW4tOQ`.

### Radix-64 Decoding

Just do the reverse of encoding.

a. Convert to 6 bit binary.

b. Club together 8 bit chunks, pad if needed.

c. Convert the binary to ASCII.

**Example**

Decode `QW4tO` (pad with `=` which is just bunch of six `0`s)

a. Q = `010000`, W = `010110`, 4 = `111000`, t = `101101`, O = `001110`

b. 8 bit chunks are `01000001`, `01101110`, `00101101`, `00111000`

c. Convert to ASCII: `01000001` = A, `01101110` = n, `00101101` = -, `00111000` = 8.

## Secure Socket Layer/Transport Level Security

Security at Transport Layer.

Threats to internet security are:

1. Integrity: No message tampering. Results in loss of privacy. Fix using cryptographic checksums, error correction codes.
2. Authentication: Claiming truthfully who you are. Use digital signatures, MACs.
3. Confidentiality: No eavesdropping. Use one way encryption algorithms.
4. Denial of Service: Flooding system with fake requests. Use proxy servers, Instrusion detection systems.

Web security can be provided using IPSec as we discussed above. One more way is TLS/SSL.

It provides confidentiality through symmetric key encryption and integrity using message authentication code.

HTTP(Application Layer) built over SSL/TLS becomes HTTPS which establishes secure communication with web server  and web browser. HTTP is built on port 80, whereas HTTPS is built on port 443.

TLS/SSL encrypts Forms(HTML), URLs(the exact specific page), Contents, Cookies(Web), Headers(HTTP).

## Intellectual Property

## Secure Electronic Transaction

## Digital Rights Management

## Intrusion Prevention and Detection

## Attacks

## Malicious Softwares

## Malware
