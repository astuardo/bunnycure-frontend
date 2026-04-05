import { ReactNode } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="dashboard-layout">
            <Navbar />
            
            <Container fluid className="px-0">
                <Row className="g-0">
                    {/* Sidebar - optimizado para desktop */}
                    <Col xs={12} md={2} xl={2} className="d-md-block" style={{ maxWidth: '250px' }}>
                        <Sidebar />
                    </Col>

                    {/* Main content - más espacio en desktop */}
                    <Col xs={12} md={10} xl={10} className="main-content-col" style={{ flex: 1 }}>
                        <main className="p-4">
                            {children}
                        </main>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
