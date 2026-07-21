// Marketing landing — static/SSR for SEO. Lives in the same app as the editor.
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-16">
      <h1 className="text-4xl font-bold">Generate video with nodes.</h1>
      <p className="mt-4 text-neutral-500">
        Drag, connect, render. Text, image, audio and video nodes on one canvas.
      </p>
      <a href="/dashboard" className="mt-8 inline-block rounded bg-black px-5 py-2 text-white">
        Open the app
      </a>
    </main>
  );
}
