export function Greeting({ name }: { name: string }) {
	return (
		<h1 className="text-center text-3xl font-medium tracking-tight sm:text-4xl">
			What should we get done, {name}?
		</h1>
	);
}
