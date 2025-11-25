import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../pages/LandingPage.css'; // Reuse styles

// Simple Button component to replace the missing UI component
const Button = ({ children, variant = 'primary', className = '', asChild, ...props }) => {
  const baseClass = 'btn-custom';
  const variantClass = variant === 'ghost' ? 'btn-ghost' : 
                       variant === 'outline' ? 'btn-outline' : 
                       'btn-primary';
  
  const combinedClass = `${baseClass} ${variantClass} ${className}`;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { 
      className: `${combinedClass} ${children.props.className || ''}`,
      ...props 
    });
  }

  return (
    <button className={combinedClass} {...props}>
      {children}
    </button>
  );
};

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Tech Stack', href: '#tech' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Live Map', href: '/map' },
  ];

  return (
    <header
      className={`header-fixed ${isScrolled ? 'header-scrolled' : 'header-transparent'}`}
    >
      <nav className="container header-nav">
        {/* Logo */}
        <Link to="/" className="header-logo group" aria-label="StreetSense Home">
          <div className="logo-icon-box group-hover-scale">
            <MapPin className="logo-icon" />
          </div>
          <span className="logo-text text-gradient">
            StreetSense
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-nav">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="nav-link-custom group"
            >
              {link.name}
              <span className="nav-link-underline" />
            </a>
          ))}
        </div>

        {/* Desktop CTA Buttons */}
        <div className="desktop-cta">
          <Button variant="ghost" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild className="shadow-elegant hover-shadow-glow">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-menu-btn"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mobile-menu"
          >
            <div className="container mobile-menu-content">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mobile-nav-link"
                >
                  {link.name}
                </motion.a>
              ))}
              <div className="mobile-cta">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
