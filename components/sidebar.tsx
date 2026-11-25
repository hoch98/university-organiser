import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenuButton
  
} from "@/components/ui/sidebar"

const pages = {
  "Universities": "/unis",
  "Documents": "/docs"
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader> 
        <span style={{textAlign: "center"}}>U-ORG</span>
      </SidebarHeader>
      <SidebarContent>
        {
          Object.keys(pages).map((obj) => {
            return <SidebarMenuButton key={obj} render={<a href={pages[obj as keyof typeof pages]} />}>
              <span>{obj}</span>
            </SidebarMenuButton>
          })
        }
      </SidebarContent>
      <SidebarFooter>
        footer
      </SidebarFooter>
    </Sidebar>
  )
}