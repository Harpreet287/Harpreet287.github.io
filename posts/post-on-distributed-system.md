---
title: "Distributed Systems Marathon"
date: "2026-04-26"
tags: ["Distributed Systems"]
hidden: false
description: "End-sem marathon for those who didn't study shit."
---
## Introduction

If you are reading it for the first time, you should be able to get overview of the concepts. If you are reading just before exam, no prior reading, you should be able to have enough knowledge to bullshit your way through the exam paper and get above average marks.

## Clocks

### Scalar Clock

### Vector Clock

### Kshemkalyani-Differential Optimization on Vector Clocks

### Strongly consistent vs Weakly Consistent

## Snapshot Algorithms

### Chandy-Lamport Algorithm

### Acharya-Badrinath Algorithm

### Lai-Yang Algorithm

## Mutex Algorithms

### Token Based

#### Lamport

#### MaeKawa

#### Ricart-Agarwala

### Non-Token Based

#### Suzuki-Kasami

## Commit Protocols -- 3PC vs 2PC

### 2PC

`Prepare`, `Commit` or `Abort` messages sent by coordinator.

1. Coordinator asks all participants to prepare for the transaction by sending `Prepare` message. If any nodes replies NO then the process is aborted.
2. Commit or Abort? Once all nodes reply YES or ready, then coordinator commits the transaction. Otherwise it aborts. If it fails at this step, then all nodes are stranded and don't know what to do.

### 3PC

Non Blocking alternative of 2PC. Has three kinds of messages.
`CanCommit`, `PreCommit` and `DoCommit` sent by Coordinator.

1. `CanCommit`: Coordinator asks all nodes, if they are in state to commit. If everyone replies YES, then only we proceed with next phase otherwise we abort. If coordinator crashes here, then we are left with no choice but to re-elect a new Coordinator.
2. `PreCommit`: Once everyone replies YES, we update state of coordinator to `PreCommit` and start sending messages to each node, indicating that every node is ready to commit. If coordinator crashes here after giving atleast one message, then we wait for re-election of a new coordinator. if that coordinator sees if any node has got `PreCommit` message, then it proceeds with `DoCommit`. If Timeout occurs before a node gets `PreCommit` message then the nodes automatically abort and release their locks rather than wait for a new leader.
3. `DoCommit`: Here we actually send message to each nodes to locally proceed with commiting the transaction. Notice that this step is fault tolerant as any node that fails to get this message, due to coordinator failure still gets that message from newly elected coordinator in second step.

Note, we have timeouts, precommits with re-elections which over better fault tolerance over 2PC.
We assume non-byzantine faults in this commit protocol. Notice commit problem is subset of consensus.

## Deadlock Detection Algorithms

### Ho-Ramamoorthy Algorithm

#### One Phase Algorithm

You ask each site about what resources it is holding and what processes depend on this resource.
For example if You have site S1 and has resource R1 and process P1 and site S2 with resource R2 and process P2.
P1(wants R1 and R2) is holding R2 and P2(wants R2 and R2) is holding R1. If you are able to draw a cycle in the nodes, then there is a deadlock.

Not Robust against Network delays. As P2 might actual release R1 just a nano second after you asked it's state. To fix the delay, two phase algorithm was developed.

#### Two Face Algorithm

As name suggests, you have to do two iterations. First iteration is same as One Phase Algorithm.
In two phase algorithm when controller sees a deadlock, instead of calling out for deadlock and start killing processes, it goes and checks again for any stale information/dependencies.

### Chandy-Misra-Haas Algorithm

Token is spread around $(i, j, k)$ which is $(source, destination, original sender)$ by the process that is stuck.
if $i^{th}$ gets back $(i, j, i)$ then $i$ realises that it is in deadlock and then it aborts to free up deadlock.

### Mitchel-Merritt Algorithm

#### Non-Priority Version

Each node has it's own private value, public value.
Has 4 steps.

1. Block: if any process p that is stuck calls for $inc(u, v)$ function. It assigns a random, unique value to that process. Initially private value equals public value.
2. Transmit: if any process(having value $u$) that is stuck sees it's neighbour(out going edge) with value $v>u$ then it sets $u:=max(u, v)$
3. Detect: if any process sees it's neighbour's public value $v$ equal to private and public values i.e $priv_u == pub_u$ and $priv_u==pub_v$ and $pub_u == pub_v$.
4. Activate: Edge is removed when a process gets resource.

#### Priority Version

public value, public priority
private value, private priority

1. Block: remains same.
2. Transmit: if any process(having value $u$) that is stuck sees it's neighbour(out going edge) with value $v>u$ then it sets $u:=max(u, v)$. Additionally, if $u==v$ then public priority of process is minimum of it's private priority and public priority of it's neighbour.
3. Detect: if $u==v$ and $public_{priority} == private_{priority} \; and \; public_{priority_neighbour} == current_{public_priority} \; and \; public_{priority_neighbour} == current_{private_priority}$
4. Activate: Same as above.
first we settle for maximum public value, then we settle for minimum priority. maximum public value and minimum private and public value calls for detect.

## Consensus Algorithms

### Crash Consensus Algorithm

In this algorithm we assume $f$ out of $n$ nodes are faulty. They can only fail, but will never send any wrong messages.
we will continute this algorithm for $f+1$ rounds.

```cpp
val_pi = init // some value
for each round in [1... f]:
  for each process p_i: 
      for each process p_j not equal to p_i:
        send_value_vi to p_j
  for each process p_i:
    val_pi:=min[all_collected_values]
```

This algorithm ensures that by the end, all nodes agree on same value. Note that, in this case, the value is minimum of all nodes that survived or minimum value of nodes that failed after their value was propagated.
**Proof of correctness**

If this algorithm is correct, we must show that

1. It terminates
2. Decision is reached on a known value i.e absence of spurious values.
3. All nodes agree on same value.

To prove $(3)$ assume that algorithm is terminated. Then let nodes `i` and `j` have values $val_i$ and $val_j$. WLOG, assume $val_i$ < $val_j$. If the value came from an alive node, say `k`,  then note that since all three nodes are alive and have communicated, then all three nodes would've agreed on minimum value.
Only case where communication isn't complete is when `k` communicated with `i` and then died. But notice that it will force the communication to go till round $f+2$ as $f+1$ nodes would've failed.

### Byzantine Agreement

In this form of agreement, we assume that faulty nodes not only crash, delay but they will send wrong values, different values to different nodes. It will simulate a malware or faulty process in an actual system. Agreement arrives iff all non faulty nodes agree on a same value.

### Lamport-Shostak-Pease Algorithm

It is naive algorithm to achieve consensus in presence of byzantine adversaries. It is shown that no consensus is possible if there is one out of three faulty nodes. Hence, we need atleast $3*f+1$ nodes to get consensus.

### Phase King Algorithm

**Working**

Network has total $n$ nodes; $f$ are Byzantine.
Run $f+1$ phases. In each phase:

1. Each node broadcasts its value to every other node.
2. Each node takes the majority i.e. $>n/2$, of received values (including its own) as the decision value.
3. If $> \frac{n}{2}+f$ nodes have that value, the node permanently sets its value to it.
4. The king calculates `majority` value, call it $V_{king}$.
5. If any node is confused, it overrides with $V_{king}$.
6. Otherwise, it ignores the king. (we will prove that king agrees to this majority)

**Discussion**

Let's assume $f$ adversaries are byzantine. That means they are allowed to lie, cheat, and send different messages to different IPs. If a network has $n$ nodes, $f$ are byzantine, then we would like to achieve consensus with honest nodes agreeing on the same value. Note that here success doesn't not mean a "correct" value since there is no one correct value. Success is achieved when all the honest nodes agree on a same value.

Total votes for majority must be $n/2$. Assume all $f$ byzantine nodes are opposing the consensus. Then total votes one must have to get majority is given by
$$
\begin{array}{l}
\text{Total Votes} > \frac{n}{2} \\\\
\text{Votes Required} - f > \frac{n}{2} \\\\
\text{Hence, Votes Required} > \frac{n}{2} + f
\end{array}
$$

In other words, if you subtract votes you got by all bad guys, you still have $50\%$ honest majority(this is important to keep honest king in sync with honest nodes).
Good guys are $n-f$. Votes required should be greater than $n/2+f$. Hence protocol succeeds if $f<n/4$.

Our algorithm runs in $f+1$ phases. In each phase, nodes vote either $0$ or $1$. If an honest node gets a dominant majority of $n/2 + f$ then it stays fixed on it's value for the rest of the remaining phases. If however, some nodes are confused, by the end of that phase, the king overrides that node's confusion with it's own vote.

Now there are two cases.

If King is dishonest and sends different responses to different [confused]honest nodes, then honest nodes still are not in consensus. Some nodes have $0$ and some have $1$. If king gives each node same value (doesn't matter 0 or 1) then all honest nodes arrive at consensus, hence a byzantine king won't prefer this choice.

If King is honest then notice that it sends same response to all the nodes. It will calculate the `majority` of the votes it got as it's own value. If the king is confused itself, it will pick some default or $0$ and sends to all the nodes. If any confused node sees this, will arrive at consensus with the king.

Note that since there are $f+1$ phases, it is guranteed by pigeonhole principle that one honest node gets chance to become the king and force all honest nodes to arrive at consensus with the king.

**Proof of Correctness**

It might not be clear still that, during honest king's turn, some honest nodes are confused and some aren't and king might give different response than what honest nodes already believe. Let's call this case as impossibility of network split and we will prove why it would never occur.
Let's say there are honest node `A` with vote $1$ and honest node `B` which has $0$. Note that the network is split. For honest node `A`, even if we subtract the sabotage of $f$ nodes, we still have $n/2 + 1$ honest nodes which voted for $1$. King will also see the same. It will calculate the `majority` and it arrives at same value as fixated node `A`! Hence king and all fixated [honest]nodes agree on same value. If any confused node was present, it will get overwritten by king's value. Hence network split is no more.

If everyone was confused, including the good king, then good king will just pick it's default value, $0$ and once again override with his own value.

Note it can't be possible that two or more honest nodes have fixated on different values. To see why, assume nodes `A` and `B` are honest. Both of them must have atleast $n/2 + 1$ nodes in favour of their value, after excluding byzantine nodes. Total number of nodes then becomes greater than $n$.

## Traversal Algorithms

In distributed systems, when a packet is sent to another process, it can happen locally(i.e. process is hosted on the same device) or sent via routers who make use of routing tables. Collectively the system forms a directed graph. A routing table stores the neighbours of that node. Often we want our transportation to be efficient, correct, robust to failures and fair to each node.

### Floyd-Warshall Algorithm

Floyd Warshall algorithm is used to find all pair shortest paths. In other words, shortest path from $i$ to $j$ for arbitrary $i$ and $j$. It works in phases. In each phase it tries to improve the shortest path from $i$ to $j$. Assume we know the shortest path from $i$ to $j$ in first $k-1$ phases. This path takes nodes only in the set ${1, 2, ... k-1}$. In the $k^{th}$ phase, we have two cases. Either shortest path follows route from $i$ to $k$ and $k$ to $j$ or it stays the same as the previous iteration. By the end of $n^{th}$ phase(total n nodes in the graph) each pairwise $(i, j)$ would've found path from all possible set of nodes from ${1,2, ..., n}$.

We start by initializing $d[i][i]=0$ and every other entry as $\infty$.

```cpp
for k in 1 to n:
  for i in 1 to n:
    for j in 1 to n: 
      d[i][j] = min(d[i][j], d[i][k]+d[k][j])
```

Note, it works for negative edge weights but it could be possible that there are negative weight cycles. In that case, one can minimize the lowest cost by iterating that cycle infinite times. If any node is unreachable by some other node, their entry in distance array remains as infinity.

### Distributed Floyd-Warshall

Above algorithm runs in memory of one device. In distributed system we have no central device. Hence each node is confined to it's own distance array $d[i]$ and is unknown to any other $d[j]$. Note this means we don't know what is $d[k]$ for $k^{th}$ phase. To fix this, every node sees if it's the intermediate node(k) for the current round. If it is, then it broadcasts it's own weight array $d[k]$. Then algorithm proceeds as usual.

### Toueg's Observation

Toueg observed that instead of flooding our table $d[k]$ everywhere, we only give $d[k]$ to the nodes who are actually using it in updation i.e. only those nodes $u$ such that $d[u][k] + d[k][v] < d[u][v]$. In other words, we forward table $d[k]$ who can reach node $K$.

But there's a problem, node $k$ doesn't know which nodes are reachable. Hence it sends $d[k]$ to it's neighbours who have next hop equal to $k$ and recurse. In recursion we see which all nodes(u) have next hop(directed edge) to our current node(v). If such edge exists with non-infinite distance then we forward $d[k]$ to it as well.

**For example**

![Distance-table propagation](<../assets/images/distributed systems/toueg.png>)

Note in the above diagram G and X can't reach $K$.

Base case: K forwards it's distance table to C.
Recursion Depth 1: C forwards table to B and E.
Recrusion Depth 2: B and E forward table to A and D respectively.

Hence every node that can reach K, recieves $d[k]$.

### Bellman Ford(SPFA)

Bellman Ford Algorithm is used to find single source shortest path. Let's call source node as $src$ and $dest$ as destination node. To simulate role of queue, each routing table broadcasts it's distance to $dest$ and if it finds the new distance is less than the previous distance.

**For example**
![Bellman-Ford example](<../assets/images/distributed systems/bellamn ford.png>)

Base Case: Here $Dest$ broadcasts it's distance from $Dest$ is 0.
Recursion Step 1: B updates it's distance to dest as $d+weight(b, dest)$. Similarly D updates distance to $d + weight(d, dest)$.
Recursion step 2: B broadcasts it's distance, 5 to $src$. $src$ updates it's value from infinity to 7. D broadcasts it's distance, 3 to B. B updates it's value from 5 to 3.
Recursion step 3: Since there was change in B's value, B broadcasts distance 3 to $src$.
Recursion step 4: $src$ updates it's value to 5.

Note this is optimized version of distributed Bellaman Ford(SPFA) or Shortest Path Faster Algorithm. In Bellman Ford, each router will blindly broadcasts it's table at some set interval.

## Termination Detection

In this model of distributed system, we have two types of nodes and their functions. First is $\textit{controlling agent}$ and second is $\textit{Regular nodes}$. We might want to capture the state of system that is contributed by states of each nodes present in the system. Any node may fire $\textit{idle}$ signal to indicate that it is idle.
Consider the situation such that we have two nodes A, B. A sends B a message and declares it is idle. While message is in transit, B also fires idle signal. While both nodes declare that they are idle to the controlling agent, infact B is not idle. To fix this, we have the following algorithm.

### Weight Throwing Algorithm

#### Notation

$B(DW)$ means a basic message `B` sent with a weight `Delta W` to a basic node.
$C(DW)$ means a control message `C` sent with weight `Delta W` to the controller.

#### Working

Initially controlling agent has total weight `1` with it. It may send B(DW) to any one of the basic nodes and is left with `1-W` weight.
Any basic node may send B(DW) to another basic node. For example: if A has total weight $W_1$, it sends a basic message $B(DW_2)$ to B, then remaining weight of A is $W_1:=W_1-W$. Since we take A, B as arbitrary, we can continue the same procedure of basic message with any other pairwise nodes (A, B) in our system.

In order for A to declare it's idle, after it's done with all it's computation, it sends $\textbf{all}$ of it's remaining weight $W_1$ to controller via $C(DW_1)$ message. Then controller updates it's own weight $W_c:=W_1+W_c$.
After controller reaches total weight $W_c==1$ it declares state of the system to be idle.

In the example above, for example A has initial weight of 0.5, B has weight 0, C(controller) has weight $0.5$. A sends B a message and a weight of $0.25$ and fires idle. Notice that C has total weight of $0.75$, B has weight of 0 while message $B(DW)$ is still intransit, hence C can't declare system as idle even if B declares idle as total of weight of C is less than 1. When B gets the message, then only if it fires idle can the system be declared as idle.

#### Proof of correctness

Algorithm is correct iff we prove Detection $\iff$ Termination. We must show both sides of implications.

First, are no false positives i.e. if algorithm detected termination then the system has no active process AND no messages in transit. Suppose algorithm detected termination, assume that system still has an active process or some message in transit. If there is still an active process then it's total weight is positive. Or if there is a message in transit, we must have sent a positive weight with that message. But then in either case total weight of controller would be less than one. But we assume that controller declares idle state iff it's total weight is one. Hence contradiction, therefore, there must be no active process AND no message in transit.

Second, if system is terminated, then algorithm will eventually detect it within finite time. In other words, no false negatives. Assume the system has terminated. That means neither are there no messages in transit nor any active process. If the controller hasn't declared idle state, then total weight of controller has to be less than one. But since every process has halted and no messages in transit, it implies all processes sent control message to controller and messages are intransit. In finite amount of time, the controller will get those messages and hence declare idle.

Note, slides mention two invariants $I_1$ and $I_2$. $I_1$ is conservation of mass i.e. total weight of all processes, controller, basic and control messages in transit is equal to $1$. $I_2$ for any arbitrary weight $W$ on process, basic and control messages, if it's non idle, then it is non zero. We make use of $I_1$ to rigorously show that there are is conservation of mass. $I_2$ implies if any active element exists in our system, it has to be of non-zero weight, hence used to conclude emptiness of the system in first part of the proof.

## Standalone Topics

### GFS--Google File System

### Consistent Hashing
