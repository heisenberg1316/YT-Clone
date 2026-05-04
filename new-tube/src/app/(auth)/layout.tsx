
interface LayoutProps {
    children : React.ReactNode
}


const Layout = ( {children} : LayoutProps ) => {
    return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-600 bg-no-repeat bg-cover`}>
            {children}
        </div>
    )
}

export default Layout;