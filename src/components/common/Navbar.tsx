import { Navbar as BsNavbar, Container, Nav, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <BsNavbar bg="white" className="shadow-sm border-bottom" expand="lg" sticky="top">
            <Container fluid>
                <BsNavbar.Brand href="/dashboard" className="d-flex align-items-center">
                    <span className="fs-4 me-2">🐰</span>
                    <span className="fw-bold text-primary">BunnyCure</span>
                </BsNavbar.Brand>

                <BsNavbar.Toggle aria-controls="navbar-nav" />
                
                <BsNavbar.Collapse id="navbar-nav" className="justify-content-end">
                    <Nav>
                        <Dropdown align="end">
                            <Dropdown.Toggle 
                                variant="light" 
                                id="dropdown-user"
                                className="d-flex align-items-center"
                            >
                                <span className="me-2">👤</span>
                                <span>{user?.fullName || user?.username}</span>
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                                <Dropdown.Item disabled>
                                    <small className="text-muted">
                                        {user?.email || 'Sin email'}
                                    </small>
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={handleLogout}>
                                    🚪 Cerrar Sesión
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                </BsNavbar.Collapse>
            </Container>
        </BsNavbar>
    );
}
