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
                    {/* Sidebar */}
                    <Col xs={12} md={3} lg={2} className="d-md-block">
                        <Sidebar />
                    </Col>

                    {/* Main content */}
                    <Col xs={12} md={9} lg={10} className="main-content-col">
                        <main className="p-4">
                            {children}
                        </main>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
