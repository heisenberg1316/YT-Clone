interface LayoutProps {
    children : React.ReactNode
}


const Layout = ( {children} : LayoutProps ) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-pink-500 ">
            {children}
        </div>
    )
}

export default Layout;