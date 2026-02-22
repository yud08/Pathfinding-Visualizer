type HeapItem = { node: number; prio: number };

export class MinHeap {
  private a: HeapItem[] = [];

  get size() {
    return this.a.length;
  }

  push(node: number, prio: number) {
    this.a.push({ node, prio });
    this.bubbleUp(this.a.length - 1);
  }

  pop(): HeapItem | null {
    if (this.a.length === 0) return null;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].prio <= this.a[i].prio) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }

  private bubbleDown(i: number) {
    const n = this.a.length;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;

      if (l < n && this.a[l].prio < this.a[m].prio) m = l;
      if (r < n && this.a[r].prio < this.a[m].prio) m = r;
      if (m === i) break;

      [this.a[m], this.a[i]] = [this.a[i], this.a[m]];
      i = m;
    }
  }
}