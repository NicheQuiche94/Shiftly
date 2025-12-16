export default function Logo({ size = "default" }) {
    const sizes = {
      small: "text-lg",
      default: "text-xl",
      large: "text-2xl",
      xl: "text-3xl"
    }
    
    return (
      <span className={`${sizes[size]} tracking-tight font-cal`}>
        Shiftly
      </span>
    )
  }