import { Component } from "react";
import { Button } from "./Button.jsx";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Kept minimal on purpose — no external error-reporting service is
    // configured in this project. Wire one up here if/when you add one.
    console.error("Unhandled UI error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-graphite-950">
          <div className="text-center max-w-sm glass-panel-strong rounded-premium-lg px-8 py-10">
            <div className="w-14 h-14 rounded-full bg-danger/10 border border-danger/25 flex items-center justify-center mx-auto mb-6">
              <span className="text-danger font-display text-xl font-semibold">!</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-bone mb-3">
              Something broke
            </h1>
            <p className="text-ash text-sm mb-8">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
            <Button variant="primary" onClick={this.handleReload}>
              Reload the page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
