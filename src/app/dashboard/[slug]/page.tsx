export default async function GenericPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize mb-2">
                    {slug}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    This module is currently under development.
                </p>
            </div>
        </div>
    );
}
