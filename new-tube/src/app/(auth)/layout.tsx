
interface LayoutProps {
    children : React.ReactNode
}


const Layout = ( {children} : LayoutProps ) => {
    return (
        <div className={`min-h-screen flex items-center justify-center bg-[url('https://i.ibb.co/0pN7VdmK/Gemini-Generated-Image-vmf4dcvmf4dcvmf4.png')] bg-no-repeat bg-cover`}>
            {children}
        </div>
    )
}

export default Layout;