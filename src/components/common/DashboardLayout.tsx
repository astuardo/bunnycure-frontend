import { useState } from 'react';
import { ReactNode } from 'react';
import { Container, Row, Col, Offcanvas } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [showSidebar, setShowSidebar] = useState(false);

    const handleCloseSidebar = () => setShowSidebar(false);
    const handleShowSidebar  = () => setShowSidebar(true);

    return (
        <div className="dashboard-layout">
            <Navbar />

            {/* ── Botón hamburguesa móvil — estilo BunnyCure ── */}
            <div
                className="d-md-none"
                style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #f0e0d8',
                    background: '#fdf6f3',
                }}
            >
                <button
                    onClick={handleShowSidebar}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#fff',
                        border: '1px solid #f0d8d0',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#5c3d2e',
                        boxShadow: '0 1px 4px rgba(180,120,100,0.08)',
                    }}
                >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
                    <span>Menú</span>
                </button>
            </div>

            {/* ── Offcanvas sidebar móvil — estilo BunnyCure ── */}
            <Offcanvas
                show={showSidebar}
                onHide={handleCloseSidebar}
                className="d-md-none"
                placement="start"
            >
                <Offcanvas.Header
                    closeButton
                    style={{ borderBottom: '1px solid #f0e0d8', background: '#fdf6f3' }}
                >
                    <Offcanvas.Title>
                        <span style={{ fontWeight: 700, color: '#5c3d2e', fontSize: '17px' }}>
                            🐰 BunnyCure
                        </span>
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0" style={{ background: '#fdf6f3' }}>
                    <Sidebar onNavigate={handleCloseSidebar} />
                </Offcanvas.Body>
            </Offcanvas>

            <Container fluid className="px-0">
                <Row className="g-0">
                    {/* Sidebar fijo desktop */}
                    <Col className="d-none d-md-block sidebar-col">
                        <Sidebar />
                    </Col>

                    {/* Main content */}
                    <Col className="main-content-col">
                        <main className="p-0">
                            {children}
                        </main>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
