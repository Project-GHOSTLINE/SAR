/**
 * 🎨 Modern Input - Composants d'input avec micro-interactions
 */

'use client'

import { motion } from 'framer-motion'
import { useState, forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface ModernInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: React.ReactNode
  helpText?: string
}

export const ModernInput = forwardRef<HTMLInputElement, ModernInputProps>(
  ({ label, error, icon, helpText, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasValue, setHasValue] = useState(false)

    // Exclude props that conflict with framer-motion
    const {
      onDrag, onDragEnd, onDragStart, onDragCapture, onDragEndCapture, onDragEnter, onDragEnterCapture,
      onDragExit, onDragExitCapture, onDragLeave, onDragLeaveCapture, onDragOver, onDragOverCapture,
      onDragStartCapture, onDrop, onDropCapture,
      onAnimationStart, onAnimationStartCapture, onAnimationEnd, onAnimationEndCapture, onAnimationIteration, onAnimationIterationCapture,
      ...inputProps
    } = props

    return (
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Label */}
        <motion.label
          className={`absolute left-3 transition-all pointer-events-none ${
            isFocused || hasValue || inputProps.value
              ? '-top-2.5 text-xs bg-white dark:bg-gray-900 px-2'
              : 'top-3.5 text-base'
          } ${
            error
              ? 'text-red-500'
              : isFocused
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
          animate={{
            scale: isFocused || hasValue || inputProps.value ? 0.85 : 1,
            y: isFocused || hasValue || inputProps.value ? 0 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
          {inputProps.required && <span className="text-red-500 ml-1">*</span>}
        </motion.label>

        {/* Input Container */}
        <div className="relative">
          {icon && (
            <motion.div
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              animate={{
                scale: isFocused ? 1.1 : 1,
                color: isFocused ? '#3b82f6' : '#9ca3af',
              }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}

          <motion.input
            ref={ref}
            {...inputProps}
            className={`w-full px-4 py-3.5 ${icon ? 'pl-11' : ''} rounded-lg border-2 transition-all
              ${
                error
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-4 ${
                error ? 'focus:ring-red-100' : 'focus:ring-blue-100 dark:focus:ring-blue-900/30'
              }
              ${className}`}
            onFocus={(e) => {
              setIsFocused(true)
              inputProps.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              setHasValue(e.target.value.length > 0)
              inputProps.onBlur?.(e)
            }}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          />

          {/* Animated Border */}
          <motion.div
            className={`absolute bottom-0 left-0 h-0.5 ${
              error ? 'bg-red-500' : 'bg-blue-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: isFocused ? '100%' : 0 }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Help Text / Error */}
        {(helpText || error) && (
          <motion.p
            className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error || helpText}
          </motion.p>
        )}
      </motion.div>
    )
  }
)

ModernInput.displayName = 'ModernInput'

interface ModernSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
  icon?: React.ReactNode
}

export const ModernSelect = forwardRef<HTMLSelectElement, ModernSelectProps>(
  ({ label, error, options, icon, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)

    // Exclude props that conflict with framer-motion
    const {
      onDrag, onDragEnd, onDragStart, onDragCapture, onDragEndCapture, onDragEnter, onDragEnterCapture,
      onDragExit, onDragExitCapture, onDragLeave, onDragLeaveCapture, onDragOver, onDragOverCapture,
      onDragStartCapture, onDrop, onDropCapture,
      onAnimationStart, onAnimationStartCapture, onAnimationEnd, onAnimationEndCapture, onAnimationIteration, onAnimationIterationCapture,
      ...selectProps
    } = props

    return (
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Label */}
        <motion.label
          className={`absolute left-3 -top-2.5 text-xs bg-white dark:bg-gray-900 px-2 pointer-events-none ${
            error
              ? 'text-red-500'
              : isFocused
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {label}
          {selectProps.required && <span className="text-red-500 ml-1">*</span>}
        </motion.label>

        {/* Select Container */}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}

          <motion.select
            ref={ref}
            {...selectProps}
            className={`w-full px-4 py-3.5 ${icon ? 'pl-11' : ''} rounded-lg border-2 transition-all
              ${
                error
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-4 ${
                error ? 'focus:ring-red-100' : 'focus:ring-blue-100 dark:focus:ring-blue-900/30'
              }
              ${className}`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            whileFocus={{ scale: 1.01 }}
          >
            <option value="">Sélectionnez...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </motion.select>
        </div>

        {/* Error */}
        {error && (
          <motion.p
            className="mt-1.5 text-sm text-red-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    )
  }
)

ModernSelect.displayName = 'ModernSelect'
