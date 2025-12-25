import { Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { MainSection } from "./main-section"
import { Separator } from "@/components/ui/separator"
import { PersonalSection } from "./personal-section"

const HomeSidebar = () => {
  return (
    <div>
        <Sidebar className="pt-16 z-40 border-none duration-300" collapsible="icon">
            <SidebarContent className="bg-background">
                <MainSection />
                <Separator />
                <PersonalSection />
            </SidebarContent>
        </Sidebar>
    </div>
  )
}

export default HomeSidebar