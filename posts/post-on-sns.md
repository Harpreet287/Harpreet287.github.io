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

Worst case space complexity is $N \prod w$ bits where N is bit size of sequence number and total w packets.

#### Range Window Protocol

```md
1. Instead of storing each packet in memory, aggregate smaller subwindows.
2. store [lowest seq number, highest seq number] per subwindow.
```

Worst case space complexity is $2 \prod N \prod w$ bits where N is bit size of sequence number and total w packets.

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

### Encoding

### Decoding

## Intellectual Property

## Secure Electronic Transaction

## Digital Rights Management

## Intrusion Prevention and Detection

## Secure Socket Layer/Transport Level Security

## Attacks

## Malicious Softwares

## Malware
