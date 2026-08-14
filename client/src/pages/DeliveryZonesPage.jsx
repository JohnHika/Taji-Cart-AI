import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FaPen, FaPlus, FaSearch, FaTrash } from 'react-icons/fa'
import SummaryApi from '../common/SummaryApi'
import CofirmBox from '../components/CofirmBox'
import EditDeliveryZone from '../components/EditDeliveryZone'
import Loading from '../components/Loading'
import NoData from '../components/NoData'
import UploadDeliveryZoneModal from '../components/UploadDeliveryZoneModal'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'

const DeliveryZonesPage = () => {
    const [openUploadZone, setOpenUploadZone] = useState(false)
    const [loading, setLoading] = useState(false)
    const [zoneData, setZoneData] = useState([])
    const [openEdit, setOpenEdit] = useState(false)
    const [editData, setEditData] = useState(null)
    const [openConfirmBoxDeactivate, setOpenConfirmBoxDeactivate] = useState(false)
    const [deactivateZone, setDeactivateZone] = useState({ _id: "" })
    const [searchTerm, setSearchTerm] = useState('')

    const fetchZones = async () => {
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.getDeliveryZones,
                params: { includeInactive: 'true' }
            })
            const { data: responseData } = response

            if (responseData.success) {
                setZoneData(responseData.data)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchZones()
    }, [])

    const handleDeactivateZone = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.deleteDeliveryZone,
                data: deactivateZone
            })

            const { data: responseData } = response

            if (responseData.success) {
                toast.success(responseData.message)
                fetchZones()
                setOpenConfirmBoxDeactivate(false)
            }
        } catch (error) {
            AxiosToastError(error)
        }
    }

    const filteredZones = zoneData.filter(zone =>
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.corridor.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Group by corridor, matching the fare chart's section layout.
    const groupedZones = useMemo(() => {
        const groups = new Map()
        filteredZones.forEach(zone => {
            if (!groups.has(zone.corridor)) {
                groups.set(zone.corridor, [])
            }
            groups.get(zone.corridor).push(zone)
        })
        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
    }, [filteredZones])

    return (
        <section className="bg-ivory dark:bg-dm-surface min-h-screen transition-colors duration-200">
            {/* Header with title, search and add button */}
            <div className="bg-white dark:bg-dm-card shadow-md p-4 sticky top-0 z-10 transition-colors duration-200">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold dark:text-white transition-colors duration-200">Delivery Zones (Bike Fare Chart)</h2>

                    {/* Search input */}
                    <div className="relative flex-grow max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-brown-400 dark:text-white/40 transition-colors duration-200" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search zones or corridors..."
                            className="pl-10 pr-4 py-2 w-full border dark:border-dm-border rounded-md bg-white dark:bg-dm-card-2 text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-300 transition-colors duration-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setOpenUploadZone(true)}
                        className="flex items-center gap-2 bg-primary-200 hover:bg-primary-100 dark:bg-primary-300 dark:hover:bg-primary-200 text-white px-4 py-2 rounded-md transition-colors duration-200"
                    >
                        <FaPlus /> Add Zone
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto p-4">
                {!loading && filteredZones.length === 0 && <NoData />}

                <div className="grid gap-6">
                    {groupedZones.map(([corridor, zones]) => (
                        <div key={corridor}>
                            <h3 className="text-sm font-bold uppercase tracking-wide text-brown-500 dark:text-white/60 mb-2">{corridor}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {zones.map((zone) => (
                                    <div
                                        key={zone._id}
                                        className={`bg-white dark:bg-dm-card rounded-lg shadow-md overflow-hidden flex flex-col transition-colors duration-200 ${!zone.isActive ? 'opacity-50' : ''}`}
                                    >
                                        <div className="p-3 flex-grow">
                                            <h4 className="font-medium text-charcoal dark:text-white transition-colors duration-200">{zone.name}</h4>
                                            <p className="text-gold-600 dark:text-gold-300 font-semibold mt-1">KES {Number(zone.fare).toLocaleString()}</p>
                                            {!zone.isActive && (
                                                <p className="text-xs text-red-500 dark:text-red-400 mt-1">Inactive</p>
                                            )}
                                        </div>

                                        <div className="flex border-t border-brown-100 dark:border-dm-border transition-colors duration-200">
                                            <button
                                                onClick={() => {
                                                    setOpenEdit(true)
                                                    setEditData(zone)
                                                }}
                                                className="flex items-center justify-center gap-1 flex-1 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/40 text-green-600 dark:text-green-400 transition-colors duration-200"
                                            >
                                                <FaPen size={14} /> Edit
                                            </button>
                                            {zone.isActive && (
                                                <button
                                                    onClick={() => {
                                                        setOpenConfirmBoxDeactivate(true)
                                                        setDeactivateZone(zone)
                                                    }}
                                                    className="flex items-center justify-center gap-1 flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 transition-colors duration-200"
                                                >
                                                    <FaTrash size={14} /> Deactivate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {loading && <Loading />}

            {/* Modals */}
            {openUploadZone && (
                <UploadDeliveryZoneModal
                    fetchData={fetchZones}
                    close={() => setOpenUploadZone(false)}
                />
            )}

            {openEdit && editData && (
                <EditDeliveryZone
                    data={editData}
                    close={() => setOpenEdit(false)}
                    fetchData={fetchZones}
                />
            )}

            {openConfirmBoxDeactivate && (
                <CofirmBox
                    close={() => setOpenConfirmBoxDeactivate(false)}
                    cancel={() => setOpenConfirmBoxDeactivate(false)}
                    confirm={handleDeactivateZone}
                />
            )}
        </section>
    )
}

export default DeliveryZonesPage
