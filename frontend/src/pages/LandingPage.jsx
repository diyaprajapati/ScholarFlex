import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    ArrowRight,
    BookOpen,
    Users,
    Award,
    CheckCircle,
    Briefcase,
    Play,
    Star,
    ChevronRight
} from 'lucide-react'
import { ROUTES } from '../config/paths'

const LOGIN_MESSAGE_KEY = 'scholarflex_login_message'

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
}

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false)
    const [loginMessage, setLoginMessage] = useState('')

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        try {
            const msg = sessionStorage.getItem(LOGIN_MESSAGE_KEY)
            if (msg) {
                sessionStorage.removeItem(LOGIN_MESSAGE_KEY)
                setLoginMessage(msg)
                const t = setTimeout(() => setLoginMessage(''), 5000)
                return () => clearTimeout(t)
            }
        } catch (_) {}
    }, [])

    return (
        <div className="min-h-screen bg-white overflow-hidden font-sans">
            {loginMessage && (
                <div
                    role="alert"
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-9999 px-4 py-3 rounded-lg shadow-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium max-w-md text-center"
                >
                    {loginMessage}
                </div>
            )}
            {/* Navbar */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-linear-to-br from-[#4C763B] to-[#B0CE88] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-900/10">
                            S
                        </div>
                        <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-gray-900' : 'text-gray-900'}`}>ScholarFlex</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors">How it Works</a>
                        <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors">Success Stories</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            to={ROUTES.LOGIN}
                            // className="text-sm font-medium text-gray-600 hover:text-[#4C763B] px-4 py-2 transition-colors"
                            className="sm:flex items-center gap-2 bg-[#4C763B] hover:bg-[#3a5c2d] text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-green-900/20 transition-all hover:scale-105"
                        >
                            Intern Login
                        </Link>
                        {/* <Link
                            to={ROUTES.STUDENT.OPEN.DASHBOARD}
                            className="hidden sm:flex items-center gap-2 bg-[#4C763B] hover:bg-[#3a5c2d] text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-green-900/20 transition-all hover:scale-105"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Link> */}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background blobs */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-[#B0CE88]/20 rounded-full blur-3xl opacity-60 animate-pulse-slow pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[600px] h-[600px] bg-[#4C763B]/10 rounded-full blur-3xl opacity-40 animate-pulse-slow pointer-events-none" style={{ animationDelay: '1s' }}></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer}
                        >
                            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-[#4C763B] text-sm font-medium mb-8 border border-green-100">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                New Batches Starting Soon
                            </motion.div>

                            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8">
                                Master Skills. <br />
                                <span className="text-transparent bg-clip-text bg-linear-to-r from-[#4C763B] to-[#B0CE88]">
                                    Launch Your Career.
                                </span>
                            </motion.h1>

                            <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                                Join ScholarFlex to access premium mentorship, real-world projects, and a pathway to your dream tech career.
                            </motion.p>

                            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    to={ROUTES.STUDENT.OPEN.DASHBOARD}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4C763B] hover:bg-[#3a5c2d] text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl shadow-green-900/20 transition-all hover:scale-105"
                                >
                                    Start Learning Now
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link
                                    to={ROUTES.CANDIDATE_REGISTER}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-8 py-4 rounded-full text-lg font-semibold border-2 border-[#4C763B] transition-all"
                                >
                                    Apply for Internship
                                </Link>
                                <Link
                                    to={ROUTES.LOGIN}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 px-8 py-4 rounded-full text-lg font-semibold transition-all"
                                >
                                    Intern Login
                                </Link>
                            </motion.div>
                            <motion.p variants={fadeInUp} className="text-sm text-gray-500 mt-4 text-center">
                                Learning access is open. Login is only required for enrolled interns.
                            </motion.p>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.8 }}
                            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 border-t border-gray-100 pt-10"
                        >
                            {[
                                { number: "10k+", label: "Active Students" },
                                { number: "500+", label: "Expert Mentors" },
                                { number: "95%", label: "Placement Rate" },
                                { number: "4.9/5", label: "Student Rating" }
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stat.number}</div>
                                    <div className="text-sm text-gray-500 font-medium uppercase tracking-wide">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-gray-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-base text-[#4C763B] font-semibold tracking-wide uppercase mb-2">Why Choose Us</h2>
                        <p className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Everything you need to succeed</p>
                        <p className="text-lg text-gray-500">We provide a comprehensive ecosystem designed to take you from beginner to expert in record time.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <BookOpen className="w-8 h-8 text-white" />,
                                title: "Structured Learning",
                                desc: "Follow a carefully curated path designed by industry experts to ensure you learn the right things in the right order.",
                                bg: "bg-blue-500"
                            },
                            {
                                icon: <Briefcase className="w-8 h-8 text-white" />,
                                title: "Real Projects",
                                desc: "Build a portfolio of real-world applications that demonstrate your skills to potential employers.",
                                bg: "bg-[#4C763B]"
                            },
                            {
                                icon: <Users className="w-8 h-8 text-white" />,
                                title: "Mentorship",
                                desc: "Get 1-on-1 guidance from seniors and industry professionals who have walked the path before you.",
                                bg: "bg-purple-500"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 group"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 shadow-lg transform group-hover:rotate-6 transition-transform`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-500 leading-relaxed mb-6">
                                    {feature.desc}
                                </p>
                                <a href="#" className="inline-flex items-center text-[#4C763B] font-semibold hover:gap-2 transition-all">
                                    Learn more <ChevronRight className="w-4 h-4 ml-1" />
                                </a>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#043915] z-0">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-full h-full bg-linear-to-l from-[#4C763B]/30 to-transparent"></div>
                </div>

                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to start your journey?</h2>
                    <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto">
                        Join thousands of students who are transforming their careers with ScholarFlex today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to={ROUTES.LOGIN}
                            className="bg-white text-[#043915] px-10 py-4 rounded-full text-lg font-bold shadow-lg hover:bg-green-50 transition-colors"
                        >
                            Get Started for Free
                        </Link>
                        <Link
                            to={ROUTES.LOGIN}
                            className="bg-transparent border-2 border-green-400/50 text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-white/10 transition-colors"
                        >
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-16 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-linear-to-br from-[#4C763B] to-[#B0CE88] rounded flex items-center justify-center text-white font-bold">
                                    S
                                </div>
                                <span className="text-xl font-bold text-white">ScholarFlex</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Empowering the next generation of tech leaders through structured learning and mentorship.
                            </p>
                            <div className="flex gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <a key={i} href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#4C763B] transition-colors">
                                        <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Platform</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">Courses</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Mentorship</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Practice</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Company</h4>
                            <ul className="space-y-4 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-6">Newsletter</h4>
                            <p className="text-gray-400 text-sm mb-4">Subscribe to our newsletter for updates and tips.</p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="bg-gray-800 border-none rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-[#4C763B]"
                                />
                                <button className="bg-[#4C763B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#3a5c2d] transition-colors">
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-500">© 2026 ScholarFlex. All rights reserved.</p>
                        <div className="flex gap-6 text-sm text-gray-500">
                            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
