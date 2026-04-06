import { useState } from 'react';
import { ReactNode } from 'react';
import { Container, Row, Col, Offcanvas, Button } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [showSidebar, setShowSidebar] = useState(false);

    const handleCloseSidebar = () => setShowSidebar(false);
    const handleShowSidebar = () => setShowSidebar(true);

    return (
        <div className="dashboard-layout">
            <Navbar />
            
            {/* Botón hamburguesa para móvil */}
            <div className="d-md-none p-3 border-bottom bg-white">
                <Button 
                    variant="outline-primary" 
                    onClick={handleShowSidebar}
                    className="d-flex align-items-center gap-2"
                >
                    <span style={{ fontSize: '1.5rem' }}>☰</span>
                    <span>Menú</span>
                </Button>
            </div>

            {/* Offcanvas sidebar para móvil */}
            <Offcanvas 
                show={showSidebar} 
                onHide={handleCloseSidebar}
                className="d-md-none"
                placement="start"
            >
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>
                        <span className="text-primary fw-bold">💅 BunnyCure</span>
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0">
                    <Sidebar onNavigate={handleCloseSidebar} />
                </Offcanvas.Body>
            </Offcanvas>
            
            <Container fluid className="px-0">
                <Row className="g-0">
                    {/* Sidebar fijo para desktop */}
                    <Col className="d-none d-md-block sidebar-col">
                        <Sidebar />
                    </Col>

                    {/* Main content */}
                    <Col className="main-content-col">
                        <main className="p-3 p-md-4">
                            {children}
                        </main>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
