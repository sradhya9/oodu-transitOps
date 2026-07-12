from backend.database.models import FleetGroup, DispatchGroup, Driver

def get_allowed_dispatch_group_ids(user):
    """
    Returns a list of dispatch_group_ids that the user is allowed to access.
    Returns None if the user has global access (e.g., Safety Officer, Financial Analyst).
    """
    role = user.role.role_name
    
    if role == 'Fleet Manager':
        fleet_groups = FleetGroup.query.filter_by(fleet_manager_id=user.id).all()
        fleet_group_ids = [fg.id for fg in fleet_groups]
        dispatch_groups = DispatchGroup.query.filter(DispatchGroup.fleet_group_id.in_(fleet_group_ids)).all()
        return [dg.id for dg in dispatch_groups]
        
    elif role == 'Dispatcher':
        dispatch_groups = DispatchGroup.query.filter_by(dispatcher_id=user.id).all()
        return [dg.id for dg in dispatch_groups]
        
    # Global access roles
    return None

def get_driver_profile_id(user):
    """
    Returns the driver profile ID associated with the user, if applicable.
    """
    if user.role.role_name == 'Driver':
        driver = Driver.query.filter_by(user_id=user.id).first()
        return driver.id if driver else None
    return None
