import React, { useRef, useState, useEffect } from 'react'
import { useForm } from "react-hook-form"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { useGlobalContext } from '../provider/GlobalProvider'
import LocationPicker from './LocationPicker'

/* ── Field flash animation for auto-fill ── */
const fieldFlashStyles = `
@keyframes fieldFlash {
  0% { background-color: rgba(34, 197, 94, 0.25); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3); }
  100% { background-color: #FDFAF7; box-shadow: none; }
}
.field-autofilled {
  animation: fieldFlash 1.2s ease-out forwards;
}
`

/* ── Brand tokens ── */
const B = {
  primary:     '#6B0F1A',
  grad:        'linear-gradient(135deg, #6B0F1A, #9B1428)',
  bg:          '#FDFAF7',
  border:      '#e2d5c8',
  focusShadow: '0 0 0 3px rgba(107,15,26,0.12)',
  textMain:    '#1A0A0A',
  textMuted:   '#6b5c5c',
}

/** Small uppercase field label */
const FieldLabel = ({ children }) => (
  <label style={{
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    color: B.primary, marginBottom: 5,
  }}>
    {children}
  </label>
)

const AddAddress = ({ close }) => {
  const { register, handleSubmit, reset, setValue } = useForm()
  const { fetchAddress } = useGlobalContext()
  const [submitting, setSubmitting]             = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [focused, setFocused]                   = useState({})
  const [autofilledFields, setAutofilledFields] = useState([])
  const submitLockRef = useRef(false)

  // Inject field flash animation styles
  useEffect(() => {
    const styleId = 'field-flash-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = fieldFlashStyles
      document.head.appendChild(style)
    }
  }, [])

  /**
   * Returns spread-able props (register result + focus/blur + computed style)
   * for an input or textarea.
   */
  const field = (name, registerOpts = {}, extraStyle = {}) => {
    const reg = register(name, registerOpts)
    const isAutofilled = autofilledFields.includes(name)
    return {
      ...reg,
      className: isAutofilled ? 'field-autofilled' : '',
      onFocus: () => setFocused(f => ({ ...f, [name]: true })),
      onBlur:  (e) => { setFocused(f => ({ ...f, [name]: false })); if (reg.onBlur) reg.onBlur(e) },
      style: {
        width: '100%', minHeight: 44, boxSizing: 'border-box',
        border: `1.5px solid ${focused[name] ? B.primary : B.border}`,
        borderRadius: 8, padding: '11px 14px',
        background: B.bg, color: B.textMain, fontSize: 14, outline: 'none',
        boxShadow: focused[name] ? B.focusShadow : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.3s',
        ...extraStyle,
      },
    }
  }

  const handleLocationSelect = (coords, displayName) => {
    setSelectedLocation(coords)
    if (displayName) setValue('addressline', displayName.split(',')[0])
  }

  /**
   * Handle structured address data from reverse geocode (GPS/drag/click)
   * Auto-fills form fields and shows visual feedback
   */
  const handleAddressDataReady = (addressData, source) => {
    const filledFields = []

    // Fill address line
    if (addressData.addressLine) {
      setValue('addressline', addressData.addressLine)
      filledFields.push('addressline')
    }

    // Fill city/area
    if (addressData.cityArea) {
      setValue('city', addressData.cityArea)
      filledFields.push('city')
    }

    // Fill county/state
    if (addressData.county) {
      setValue('state', addressData.county)
      filledFields.push('state')
    }

    // Fill postal code
    if (addressData.postalCode) {
      setValue('pincode', addressData.postalCode)
      filledFields.push('pincode')
    }

    // Fill country
    if (addressData.country) {
      setValue('country', addressData.country)
      filledFields.push('country')
    }

    // Trigger field flash animation
    setAutofilledFields(filledFields)
    setTimeout(() => setAutofilledFields([]), 1200)

    // Show toast based on source
    if (source === 'gps') {
      toast.success('📍 Address auto-filled from your location')
    } else if (source === 'marker-drag') {
      toast.success('📍 Address updated from marker position')
    } else if (source === 'map-click') {
      toast.success('📍 Address filled from selected point')
    }
  }

  const onSubmit = async (data) => {
    if (submitLockRef.current || submitting) return
    if (!selectedLocation) {
      toast.error('Please select your delivery location on the map')
      return
    }
    try {
      submitLockRef.current = true
      setSubmitting(true)
      const response = await Axios({
        ...SummaryApi.createAddress,
        data: {
          address_line:         data.addressline,
          city:                 data.city,
          state:                data.state,
          country:              data.country,
          pincode:              data.pincode,
          mobile:               data.mobile,
          coordinates:          selectedLocation,
          deliveryInstructions: data.deliveryInstructions || '',
        },
        requestLockKey: `address:create:${data.addressline}:${data.city}:${data.mobile}`,
      })
      const { data: res } = response
      if (res.success) {
        toast.success(res.message)
        if (close) { close(); reset(); setSelectedLocation(null); fetchAddress() }
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setSubmitting(false)
      submitLockRef.current = false
    }
  }

  return (
    /* ── Overlay ── */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => e.target === e.currentTarget && close?.()}
    >
      {/* ── Modal / bottom-sheet ── */}
      <div
        className="w-full sm:max-w-[680px] sm:mx-4 overflow-y-auto rounded-t-2xl sm:rounded-xl safe-area-bottom"
        style={{
          background:  B.bg,
          maxHeight:   '90dvh',
          boxShadow:   '0 25px 60px rgba(0,0,0,0.18)',
          border:      '1px solid #e2d5c8',
          padding:     '20px 20px 32px',
        }}
      >
        {/* Drag handle – mobile only */}
        <div
          className="sm:hidden mx-auto mb-4"
          style={{ width: 40, height: 4, background: '#d0c0b8', borderRadius: 2 }}
        />

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, paddingLeft: 14, borderLeft: `4px solid ${B.primary}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={B.primary}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: B.textMain, margin: 0 }}>
              Add Delivery Address
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="hover:bg-[#f5ece8] transition-colors"
            style={{
              width: 30, height: 30, borderRadius: '50%',
              border: `1px solid ${B.border}`, background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: B.textMuted, flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Location picker ── */}
        <div style={{ marginBottom: 20 }}>
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            onAddressDataReady={handleAddressDataReady}
            initialPosition={selectedLocation}
          />
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Address line – full width */}
          <div>
            <FieldLabel>Address / Building Name *</FieldLabel>
            <input type="text" placeholder="e.g., Kencom House, 2nd Floor"
              {...field('addressline', { required: true })} />
          </div>

          {/* City / County - paired side-by-side on mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>City / Area *</FieldLabel>
              <input type="text" placeholder="e.g., Nairobi CBD"
                {...field('city', { required: true })} />
            </div>
            <div>
              <FieldLabel>County *</FieldLabel>
              <input type="text" placeholder="e.g., Nairobi"
                {...field('state', { required: true })} />
            </div>
          </div>

          {/* Phone / Postal - paired side-by-side on mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Phone Number *</FieldLabel>
              <input type="tel" placeholder="e.g., 0712345678"
                {...field('mobile', { required: true })} />
            </div>
            <div>
              <FieldLabel>Postal Code</FieldLabel>
              <input type="text" inputMode="numeric" placeholder="e.g., 00100"
                {...field('pincode')} />
            </div>
          </div>

          {/* Country */}
          <div>
            <FieldLabel>Country *</FieldLabel>
            <input type="text" defaultValue="Kenya"
              {...field('country', { required: true })} />
          </div>

          {/* Delivery instructions */}
          <div>
            <FieldLabel>Delivery Instructions</FieldLabel>
            <textarea
              rows={3}
              placeholder="e.g., Gate code is 1234, call when you arrive, leave with security…"
              {...field('deliveryInstructions', {}, { minHeight: 80, resize: 'none', lineHeight: '1.5', paddingTop: 11 })}
            />
          </div>

          {/* ── CTA - sticky on mobile for easier access ── */}
          <div className="sticky bottom-0 -mx-5 px-5 py-3 bg-[#FDFAF7] sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent border-t sm:border-t-0 border-[#e8ddd5] mt-4">
            <button
              type="submit"
              disabled={submitting || !selectedLocation}
              className={!submitting && selectedLocation ? 'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(107,15,26,0.35)]' : ''}
              style={{
                background: submitting || !selectedLocation ? '#c4b5b5' : B.grad,
                color: 'white', border: 'none', borderRadius: 10,
                height: 54, width: '100%', fontSize: 15, fontWeight: 700,
                cursor: submitting || !selectedLocation ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {submitting
                ? 'Saving Address…'
                : !selectedLocation
                  ? 'Select Location on Map First'
                  : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddAddress
