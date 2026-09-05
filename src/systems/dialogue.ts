import type { DialogueChoice, DialogueNode, DialogueScript } from '../data/schema';

export class DialogueRunner {
  private readonly byId: Map<string, DialogueNode>;
  private node: DialogueNode;
  private finished = false;

  constructor(private readonly script: DialogueScript, private readonly flags: Set<string>) {
    this.byId = new Map(script.nodes.map((n) => [n.id, n]));
    this.node = script.nodes[0]!;
    this.enter(this.node);
  }

  private enter(node: DialogueNode): void {
    this.node = node;
    for (const f of node.setFlags ?? []) this.flags.add(f);
  }

  private jump(id: string): void {
    const n = this.byId.get(id);
    if (!n) throw new Error(`${this.script.id}: node ${id} not found`);
    this.enter(n);
  }

  current(): DialogueNode {
    return this.node;
  }

  isFinished(): boolean {
    return this.finished;
  }

  choices(): DialogueChoice[] {
    return (this.node.choices ?? []).filter((c) => (c.requiresFlags ?? []).every((f) => this.flags.has(f)));
  }

  awaitingChoice(): boolean {
    return !this.finished && this.choices().length > 0;
  }

  next(): boolean {
    if (this.finished || this.awaitingChoice()) return false;
    if (this.node.end || !this.node.next) {
      this.finished = true;
      return false;
    }
    this.jump(this.node.next);
    return true;
  }

  choose(index: number): void {
    const options = this.choices();
    const choice = options[index];
    if (!this.awaitingChoice() || !choice) throw new Error(`${this.script.id}: no choice at index ${index}`);
    for (const f of choice.setFlags ?? []) this.flags.add(f);
    this.jump(choice.next);
  }
}
