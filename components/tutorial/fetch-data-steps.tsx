import { TutorialStep } from "./tutorial-step";
import { CodeBlock } from "./code-block";

const create = `create table notes (
  id bigserial primary key,
  title text
);

insert into notes(title)
values
  ('Today I created a Supabase project.'),
  ('I added some data and queried it from Next.js.'),
  ('It was awesome!');
`.trim();

const rls = `alter table notes enable row level security;
create policy "Allow public read access" on notes
for select
using (true);`.trim();

// Example snippets adjusted for generic data fetching

export function FetchDataSteps() {
  return (
    <ol className="flex flex-col gap-6">
      <TutorialStep title="Create some tables and insert some data">
        <p>
          Head over to the{" "}
          <a
            href="#"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Table Editor
          </a>{" "}
          for your database to create a collection and insert some example data.
          If you&apos;re stuck for creativity, you can copy and paste the
          following into the{" "}
          <a
            href="#"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            SQL Editor
          </a>{" "}
          and click RUN!
        </p>
        <CodeBlock code={create} />
      </TutorialStep>

      <TutorialStep title="Enable Row Level Security (RLS)">
        <p>
          Ensure you have proper access control for your API endpoints. from
          your <code>notes</code> table, you need to add a policy. You can do
          this in the{" "}
          <a
            href="#"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Table Editor
          </a>{" "}
          or via the{" "}
          <a
            href="#"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            SQL Editor
          </a>
          .
        </p>
        <p>
          For example, you can run the following SQL to allow public read
          access:
        </p>
        <CodeBlock code={rls} />
        <p>
          You can learn more about RLS in the{" "}
          <a
            href="#"
            className="font-bold hover:underline text-foreground/80"
            target="_blank"
            rel="noreferrer"
          >
            Documentation
          </a>
          .
        </p>
      </TutorialStep>

      <TutorialStep title="Query data from Next.js">
        <p>
          To fetch data from an Async Server Component, create a new page.tsx
          file at{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            /app/notes/page.tsx
          </span>{" "}
          and add the following.
        </p>
        <CodeBlock
          code={`// Example server fetch with Next.js Route Handlers
  const res = await fetch('/api/notes')
  const notes = await res.json()`}
        />
        <p>Alternatively, you can use a Client Component.</p>
        <CodeBlock
          code={`// Example client fetch
  const res = await fetch('/api/notes')
  const data = await res.json()`}
        />
      </TutorialStep>

      <TutorialStep title="Explore UI building blocks">
        <p>
          Head over to a UI library and try installing some blocks. For example,
          you can install a Realtime Chat block by running:
        </p>
        <CodeBlock code={"npx shadcn@latest add components.json"} />
      </TutorialStep>

      <TutorialStep title="Build in a weekend and scale to millions!">
        <p>You&apos;re ready to launch your product to the world! 🚀</p>
      </TutorialStep>
    </ol>
  );
}
