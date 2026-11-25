import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex w-full min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1>Welcome to Uni Organiser</h1>
          <p>idk i just got kinda pissed off with the amount of documents you have to handle during college apps, different portals needing differnet documents merged different ways, different, just gets super messy</p>
          <p>head to the Universities page to get started, you can add unis and add your supplementals, you can easily view and manage added supplemental questions</p>
          <p>then you can go to the documents tab to store and manage your files, you can view/download them, or easily merge them together</p>
          <Button className="mt-2">cool button oooooo</Button>
        </div>
      </div>
    </div>
  )
}
