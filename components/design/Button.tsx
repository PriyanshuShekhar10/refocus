import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactNode,
} from "react";
import styles from "./design.module.css";

type Variant = "primary" | "ghost" | "quiet" | "danger";
type Size = "default" | "lg" | "sm";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
    as?: "button";
    type?: "button" | "submit" | "reset";
  };

type ButtonAsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: "a";
  };

export type DButtonProps = ButtonAsButton | ButtonAsAnchor;

function variantClass(variant: Variant) {
  if (variant === "primary") return styles.btnPrimary;
  if (variant === "ghost") return styles.btnGhost;
  if (variant === "danger") return styles.btnDanger;
  return styles.btnQuiet;
}

function sizeClass(size: Size) {
  if (size === "lg") return styles.btnLg;
  if (size === "sm") return styles.btnSm;
  return "";
}

export const DButton = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  DButtonProps
>(function DButton(props, ref) {
  const {
    variant = "primary",
    size = "default",
    full,
    className,
    children,
  } = props;

  const classes = [
    styles.btn,
    variantClass(variant),
    sizeClass(size),
    full ? styles.btnFull : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (props.as === "a") {
    const {
      as: _as,
      variant: _v,
      size: _s,
      full: _f,
      className: _c,
      children: _ch,
      ...rest
    } = props;
    void _as;
    void _v;
    void _s;
    void _f;
    void _c;
    void _ch;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={classes}
        {...rest}
      >
        {children}
      </a>
    );
  }

  const {
    as: _as,
    variant: _v,
    size: _s,
    full: _f,
    className: _c,
    children: _ch,
    type = "button",
    ...rest
  } = props as ButtonAsButton;
  void _as;
  void _v;
  void _s;
  void _f;
  void _c;
  void _ch;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      {...rest}
    >
      {children}
    </button>
  );
});
