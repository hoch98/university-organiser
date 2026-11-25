"use client"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { University } from "@/lib/types";
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import ViewDetailsModal from "./components/ViewDetailsModal";
import EditSupplementalsModal from "./components/EditSupplementalsModal";

export default function Page() {

  const [universities, setUniversities] = useState<Array<University>>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const statusButtonClasses: Record<string, string> = {
    Considering:
      "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900",
    Applying:
      "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900",
    Applied:
      "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900",
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem("university_list");
      if (saved) {
        setUniversities(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Failed to read universities from localStorage:", err);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    try {
      localStorage.setItem("university_list", JSON.stringify(universities));
    } catch (err) {
      console.error("Failed to save universities to localStorage:", err);
    }
  }, [universities, hasLoaded]);
  
  return (
    <div className="flex min-h-svh p-6 w-full">
      <div className="flex w-full gap-2 min-w-0 flex-col leading-loose">
        <h1>Universities ({universities.length})</h1>
        <Input 
          type="text" 
          placeholder="Search University..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex flex-col gap-4 mt-3">
          {
            universities.filter(university => (university.name + university.country).toLowerCase().includes(searchQuery.toLowerCase())).map((university:University) => {
              return (
              <Card className="w-full" key={university.name}>
                <CardHeader>
                  <CardTitle>{university.name}</CardTitle>
                  <CardDescription>{university.country}</CardDescription>
                  <CardAction>
                    <Badge className={
                      university.status == "Considering" ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" :
                      university.status == "Applying" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300":
                      university.status == "Applied" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : ""
                    }>
                      {university.status}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="flex flex-row flex-wrap gap-2">
                  {
                    "supplementals" in university ?
                    <EditSupplementalsModal university={university} universities={universities} setUniversities={setUniversities}/>
                    : ""
                  }
                  
                  {(["Considering", "Applying", "Applied"] as const)
                    .filter((status) => status !== university.status)
                    .map((status) => (
                      <Button
                        onClick={() => {
                          setUniversities((prev) =>
                            prev.map((uni) =>
                              uni.name === university.name ? { ...uni, status } : uni
                            )
                          );
                        }}
                        key={status}
                        className={statusButtonClasses[status]}
                      >
                        Set as {status}
                      </Button>
                    ))}
                  
                  <div className="ml-auto flex flex-row gap-4">
                    <Dialog>
                      <DialogTrigger><Button variant="destructive">Remove University</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remove {university.name}?</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to remove {university.name} from your university list?
                          </DialogDescription>
                        </DialogHeader>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setUniversities((prev) =>
                              prev.filter((uni) => uni.name !== university.name)
                            );
                          }}
                        >
                          Confirm Remove
                        </Button>
                      </DialogContent>
                    </Dialog>
                    <ViewDetailsModal university={university}/>
                  </div>
                </CardFooter>
              </Card>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}
